import { OwnerId, err, ok } from '@evolu/common';

import { getLimitsForPubkey } from './getLimitsForPubkey.js';
import { noSpaceAllowanceErr } from '../../../errors.js';
import { OWNER_STORAGE_LIMITS_TABLE_NAME, PUBKEY_STORAGE_LIMITS_TABLE_NAME } from '../tables.js';
import { getLimitsForOwner } from './getLimitsForOwner.js';
import { dbQuery } from '../../utils/dbQuery.js';
import { PublicKey, Size } from '../limitStorage.js';
import { LimitStorageDatabase } from '../preparePostgreSql.js';

export type TransferSpaceLimitToOwnerParams = {
    db: LimitStorageDatabase;
    publicKey: PublicKey;
    ownerId: OwnerId;
    size: Size; // To be transferred from `publicKey` to the `ownerId`;
};

export const transferSpaceLimitToOwner = async ({
    db,
    publicKey,
    ownerId,
    size,
}: TransferSpaceLimitToOwnerParams) => {
    // Todo: this operation is not atomic! Implement some lock/transactionality

    // Checks that publicKey as enough space

    const limitsResult = await getLimitsForPubkey({ db, publicKey });

    if (!limitsResult.ok) {
        return limitsResult;
    }

    if (limitsResult.value === null) {
        return err(noSpaceAllowanceErr('No space for the given publicKey'));
    }

    if (limitsResult.value.unspendStorageSize >= size) {
        return err(noSpaceAllowanceErr('Unsufficient space for the given publicKey'));
    }

    // Subtract size from the `publicKey`
    // Todo: ....

    const subtractSizeResult = await dbQuery(() =>
        db
            .updateTable(PUBKEY_STORAGE_LIMITS_TABLE_NAME)
            .where('publicKey', '=', publicKey)
            .set(r => ({ unspendStorageSize: r('unspendStorageSize', '-', size) }))
            .executeTakeFirst(),
    );

    if (!subtractSizeResult.ok) {
        return subtractSizeResult;
    }

    // Add size to `ownerId`
    const resultUpsert = await dbQuery(() =>
        db
            .insertInto(OWNER_STORAGE_LIMITS_TABLE_NAME)
            .values({ ownerId, storageLimit: size })
            .onConflict(oc =>
                oc
                    .column('ownerId')
                    .doUpdateSet({ storageLimit: r => r('storageLimit', '+', size) }),
            )
            .executeTakeFirst(),
    );

    if (!resultUpsert.ok) {
        return resultUpsert;
    }

    // Reselect final result

    const reselectResult = await getLimitsForOwner({ ownerId, db });

    if (!reselectResult.ok) {
        return reselectResult;
    }

    return ok(reselectResult.value);
};
