import { OwnerId, type Result, err, ok } from '@evolu/common';

import { type ConsistencyError, consistencyError, noSpaceAllowanceErr } from '../../../errors.js';
import { OWNER_STORAGE_LIMITS_TABLE_NAME, PUBKEY_STORAGE_LIMITS_TABLE_NAME } from '../tables.js';
import { getLimitsForOwner } from './getLimitsForOwner.js';
import { type GetLimitsForPubkeyResponse, getLimitsForPubkey } from './getLimitsForPubkey.js';
import { DatabaseError, dbQuery } from '../../utils/dbQuery.js';
import { PublicKey, Size } from '../limitStorage.js';
import { LimitStorageDatabase } from '../preparePostgreSql.js';

export type AssignSpaceToOwnerParams = {
    db: LimitStorageDatabase;
    publicKey: PublicKey;
    ownerId: OwnerId;
    size: Size;
};

export type AssignSpaceToOwnerResult = {
    publicKeyLimits: GetLimitsForPubkeyResponse;
    ownerStorageLimit: number | null;
};

export const OWNER_ID_BURN = '0' as OwnerId;

type NoSpaceAllowance = ReturnType<typeof noSpaceAllowanceErr>;

export const assignSpaceToOwner = async ({
    db,
    publicKey,
    ownerId,
    size,
}: AssignSpaceToOwnerParams): Promise<
    Result<AssignSpaceToOwnerResult, DatabaseError | NoSpaceAllowance | ConsistencyError>
> => {
    const limitsResult = await getLimitsForPubkey({ db, publicKey });

    if (!limitsResult.ok) {
        return err({ type: 'DatabaseError', error: 'limitResult error' });
    }

    if (limitsResult.value === null) {
        return err(noSpaceAllowanceErr('No space allowance for the given publicKey'));
    }

    if (limitsResult.value.unspendStorageSize < size) {
        return err(noSpaceAllowanceErr('Insufficient unspent space for the given publicKey'));
    }

    const subtractResult = await dbQuery(() =>
        db
            .updateTable(PUBKEY_STORAGE_LIMITS_TABLE_NAME)
            .set({
                unspendStorageSize: eb => eb('unspendStorageSize', '-', size),
            })
            .where('publicKey', '=', publicKey)
            .executeTakeFirst(),
    );

    if (!subtractResult.ok) {
        return subtractResult;
    }

    if (ownerId === OWNER_ID_BURN) {
        const reselectResult = await getLimitsForPubkey({ db, publicKey });

        if (!reselectResult.ok) {
            return reselectResult;
        }

        if (reselectResult.value === null) {
            return err(consistencyError('Public key limits disappeared after assignment'));
        }

        return ok({
            publicKeyLimits: reselectResult.value,
            ownerStorageLimit: null,
        });
    }

    const upsertResult = await dbQuery(() =>
        db
            .insertInto(OWNER_STORAGE_LIMITS_TABLE_NAME)
            .values({
                ownerId,
                storageLimit: size,
            })
            .onConflict(oc =>
                oc.column('ownerId').doUpdateSet({
                    storageLimit: eb => eb('storageLimit', '+', size),
                }),
            )
            .executeTakeFirst(),
    );

    if (!upsertResult.ok) {
        return upsertResult;
    }

    const ownerResult = await getLimitsForOwner({ db, ownerId });

    if (!ownerResult.ok) {
        return ownerResult;
    }

    const ownerStorageLimit = ownerResult.value;

    const reselectResult = await getLimitsForPubkey({ db, publicKey });

    if (!reselectResult.ok) {
        return reselectResult;
    }

    if (reselectResult.value === null) {
        return err(consistencyError('Public key limits disappeared after assignment'));
    }

    return ok({
        publicKeyLimits: reselectResult.value,
        ownerStorageLimit,
    });
};
