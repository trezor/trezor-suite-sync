import { OwnerId, type Result, err, ok } from '@evolu/common';

import { type GetLimitsForOwnerDep } from './createGetLimitsForOwner.js';
import {
    type GetLimitsForPubkeyDep,
    type GetLimitsForPubkeyResponse,
} from './createGetLimitsForPubkey.js';
import { type ConsistencyError, consistencyError, noSpaceAllowanceErr } from '../../../errors.js';
import { AppDatabaseDep } from '../../postgres/createPostgreSql.js';
import {
    OWNER_STORAGE_LIMITS_TABLE_NAME,
    PUBKEY_STORAGE_LIMITS_TABLE_NAME,
} from '../../postgres/tables.js';
import { DatabaseError, dbQuery } from '../../utils/dbQuery.js';
import { PublicKey, Size } from '../limitStorage.js';

export type AssignSpaceToOwnerDeps = AppDatabaseDep & GetLimitsForPubkeyDep & GetLimitsForOwnerDep;

export type AssignSpaceToOwnerParams = {
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

export type AssignSpaceToOwner = (
    params: AssignSpaceToOwnerParams,
) => Promise<Result<AssignSpaceToOwnerResult, DatabaseError | NoSpaceAllowance | ConsistencyError>>;

export type AssignSpaceToOwnerDep = { assignSpaceToOwner: AssignSpaceToOwner };

export const createAssignSpaceToOwner =
    ({ db, getLimitsForPubkey, getLimitsForOwner }: AssignSpaceToOwnerDeps): AssignSpaceToOwner =>
    async ({ publicKey, ownerId, size }) => {
        const limitsResult = await getLimitsForPubkey({ publicKey });

        if (!limitsResult.ok) {
            return err({ type: 'DatabaseError', error: 'limitResult error' });
        }

        if (limitsResult.value === null) {
            return err(noSpaceAllowanceErr('No space allowance for the given publicKey'));
        }

        if (limitsResult.value.unspentStorageSize < size) {
            return err(noSpaceAllowanceErr('Insufficient unspent space for the given publicKey'));
        }

        const subtractResult = await dbQuery(() =>
            db
                .updateTable(PUBKEY_STORAGE_LIMITS_TABLE_NAME)
                .set({
                    unspentStorageSize: eb =>
                        eb('pubkey_storage_limits.unspentStorageSize', '-', size),
                })
                .where('publicKey', '=', publicKey)
                .executeTakeFirst(),
        );

        if (!subtractResult.ok) {
            return subtractResult;
        }

        if (ownerId === OWNER_ID_BURN) {
            const reselectResult = await getLimitsForPubkey({ publicKey });

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
                        storageLimit: eb => eb('owner_storage_limits.storageLimit', '+', size),
                    }),
                )
                .executeTakeFirst(),
        );

        if (!upsertResult.ok) {
            return upsertResult;
        }

        const ownerResult = await getLimitsForOwner({ ownerId });

        if (!ownerResult.ok) {
            return ownerResult;
        }

        const ownerStorageLimit = ownerResult.value;

        const reselectResult = await getLimitsForPubkey({ publicKey });

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
