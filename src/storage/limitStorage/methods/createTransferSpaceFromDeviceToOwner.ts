import { OwnerId, type Result, err, ok } from '@evolu/common';

import { GetLimitsForOwnerDep } from './createGetLimitsForOwner.js';
import { GetLimitsForPubkeyDep } from './createGetLimitsForPubkey.js';
import { noSpaceAllowanceErr } from '../../../errors.js';
import { AppDatabaseDep } from '../../posgres/createPostgreSql.js';
import {
    OWNER_STORAGE_LIMITS_TABLE_NAME,
    PUBKEY_STORAGE_LIMITS_TABLE_NAME,
} from '../../posgres/tables.js';
import { DatabaseError } from '../../utils/dbQuery.js';
import { type PublicKey, type Size } from '../limitStorage.js';

type NoSpaceAllowance = ReturnType<typeof noSpaceAllowanceErr>;

const isNoSpaceAllowance = (error: unknown): error is NoSpaceAllowance =>
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'NoStorageAllowance';

export type TransferSpaceFromDeviceToOwnerDeps = AppDatabaseDep &
    GetLimitsForPubkeyDep &
    GetLimitsForOwnerDep;

export type TransferSpaceLimitToOwnerParams = {
    publicKey: PublicKey;
    ownerId: OwnerId;
    size: Size; // To be transferred from `publicKey` to the `ownerId`;
};

type TransferSpaceFromDeviceToOwner = (
    params: TransferSpaceLimitToOwnerParams,
) => Promise<Result<number | null, DatabaseError | NoSpaceAllowance>>;

export type TransferSpaceFromDeviceToOwnerDep = {
    transferSpaceFromDeviceToOwner: TransferSpaceFromDeviceToOwner;
};

export const createTransferSpaceFromDeviceToOwner =
    (deps: TransferSpaceFromDeviceToOwnerDeps): TransferSpaceFromDeviceToOwner =>
    async ({ publicKey, ownerId, size }) => {
        if (size <= 0) {
            return err(noSpaceAllowanceErr('Transfer size must be positive'));
        }

        try {
            const result = await deps.db.transaction().execute(async trx => {
                // Checks that publicKey has enough space (inside transaction for atomicity)
                const limitsResult = await deps.getLimitsForPubkey({ trx, publicKey });

                if (!limitsResult.ok) {
                    throw limitsResult.error;
                }

                if (limitsResult.value === null) {
                    throw noSpaceAllowanceErr('No space for the given publicKey');
                }

                if (limitsResult.value.unspendStorageSize < size) {
                    throw noSpaceAllowanceErr('Insufficient space for the given publicKey');
                }

                // Subtract size from the `publicKey`
                await trx
                    .updateTable(PUBKEY_STORAGE_LIMITS_TABLE_NAME)
                    .where('publicKey', '=', publicKey)
                    .set(r => ({ unspendStorageSize: r('unspendStorageSize', '-', size) }))
                    .executeTakeFirst();

                // Add size to `ownerId`
                await trx
                    .insertInto(OWNER_STORAGE_LIMITS_TABLE_NAME)
                    .values({ ownerId, storageLimit: size })
                    .onConflict(oc =>
                        oc
                            .column('ownerId')
                            .doUpdateSet({ storageLimit: r => r('storageLimit', '+', size) }),
                    )
                    .executeTakeFirst();

                // Reselect final result
                const reselectResult = await deps.getLimitsForOwner({ ownerId, trx });

                if (!reselectResult.ok) {
                    throw reselectResult.error;
                }

                return reselectResult.value;
            });

            return ok(result);
        } catch (error) {
            if (isNoSpaceAllowance(error)) {
                return err(error);
            }

            return err({ type: 'DatabaseError', error });
        }
    };
