import { OwnerId, type Result, err, ok } from '@evolu/common';

import { noSpaceAllowanceErr } from '../../../errors.js';
import { OWNER_STORAGE_LIMITS_TABLE_NAME, PUBKEY_STORAGE_LIMITS_TABLE_NAME } from '../tables.js';
import { getLimitsForOwner } from './getLimitsForOwner.js';
import { getLimitsForPubkey } from './getLimitsForPubkey.js';
import { DatabaseError } from '../../utils/dbQuery.js';
import { type PublicKey, type Size } from '../limitStorage.js';
import { LimitStorageDatabase } from '../preparePostgreSql.js';

export type TransferSpaceLimitToOwnerParams = {
    db: LimitStorageDatabase;
    publicKey: PublicKey;
    ownerId: OwnerId;
    size: Size; // To be transferred from `publicKey` to the `ownerId`;
};

type NoSpaceAllowance = ReturnType<typeof noSpaceAllowanceErr>;

const isNoSpaceAllowance = (error: unknown): error is NoSpaceAllowance =>
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'NoStorageAllowance';

export const transferSpaceLimitToOwner = async ({
    db,
    publicKey,
    ownerId,
    size,
}: TransferSpaceLimitToOwnerParams): Promise<
    Result<number | null, DatabaseError | NoSpaceAllowance>
> => {
    if (size <= 0) {
        return err(noSpaceAllowanceErr('Transfer size must be positive'));
    }

    try {
        const result = await db.transaction().execute(async trx => {
            // Checks that publicKey has enough space (inside transaction for atomicity)
            const limitsResult = await getLimitsForPubkey({ db: trx, publicKey });

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
            const reselectResult = await getLimitsForOwner({ ownerId, db: trx });

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
