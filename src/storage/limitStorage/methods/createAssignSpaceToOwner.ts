import { OwnerId, type Result, err, ok } from '@evolu/common';

import { type GetLimitsForOwnerDep } from './createGetLimitsForOwner.js';
import {
    type GetLimitsForPubkeyDep,
    type GetLimitsForPubkeyResponse,
} from './createGetLimitsForPubkey.js';
import {
    type ConsistencyError,
    consistencyError,
    isConsistencyError,
    isNoSpaceAllowance,
    noSpaceAllowanceErr,
} from '../../../errors.js';
import { AppDatabaseDep } from '../../postgres/createPostgreSql.js';
import {
    OWNER_STORAGE_LIMITS_TABLE_NAME,
    PUBKEY_STORAGE_LIMITS_TABLE_NAME,
} from '../../postgres/tables.js';
import { DatabaseError } from '../../utils/dbQuery.js';
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
        try {
            const result = await db.transaction().execute(async trx => {
                const limitsResult = await getLimitsForPubkey({ trx, publicKey });

                if (!limitsResult.ok) {
                    throw limitsResult.error;
                }

                if (limitsResult.value === null) {
                    throw noSpaceAllowanceErr('No space allowance for the given publicKey');
                }

                if (limitsResult.value.unspentStorageSize < size) {
                    throw noSpaceAllowanceErr('Insufficient unspent space for the given publicKey');
                }

                const subtractResult = await trx
                    .updateTable(PUBKEY_STORAGE_LIMITS_TABLE_NAME)
                    .set(eb => ({ unspentStorageSize: eb('unspentStorageSize', '-', size) }))
                    .where('publicKey', '=', publicKey)
                    // Guarding the statement itself keeps the debit correct even when a concurrent
                    // request spent the space between the read above and this update.
                    .where('unspentStorageSize', '>=', size)
                    .executeTakeFirst();

                if (subtractResult.numUpdatedRows === 0n) {
                    throw noSpaceAllowanceErr('Insufficient unspent space for the given publicKey');
                }

                let ownerStorageLimit: number | null = null;

                if (ownerId !== OWNER_ID_BURN) {
                    await trx
                        .insertInto(OWNER_STORAGE_LIMITS_TABLE_NAME)
                        .values({ ownerId, storageLimit: size })
                        .onConflict(oc =>
                            oc
                                .column('ownerId')
                                .doUpdateSet({ storageLimit: eb => eb('storageLimit', '+', size) }),
                        )
                        .executeTakeFirst();

                    const ownerResult = await getLimitsForOwner({ trx, ownerId });

                    if (!ownerResult.ok) {
                        throw ownerResult.error;
                    }

                    ownerStorageLimit = ownerResult.value;
                }

                const reselectResult = await getLimitsForPubkey({ trx, publicKey });

                if (!reselectResult.ok) {
                    throw reselectResult.error;
                }

                if (reselectResult.value === null) {
                    throw consistencyError('Public key limits disappeared after assignment');
                }

                return {
                    publicKeyLimits: reselectResult.value,
                    ownerStorageLimit,
                };
            });

            return ok(result);
        } catch (error) {
            if (isNoSpaceAllowance(error) || isConsistencyError(error)) {
                return err(error);
            }

            return err({ type: 'DatabaseError', error });
        }
    };
