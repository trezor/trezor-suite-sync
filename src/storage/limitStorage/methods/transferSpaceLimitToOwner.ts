import { err, ok, sql, type Sqlite } from '@evolu/common';
import { getLimitsForPubkey } from './getLimitsForPubkey.js';
import { noSpaceAllowanceErr } from '../../../errors.js';
import { OWNER_STORAGE_LIMITS_TABLE_NAME, PUBKEY_STORAGE_LIMITS_TABLE_NAME } from '../tables.js';
import { getLimitsForOwner } from './getLimitsForOwner.js';

export type TransferSpaceLimitToOwnerParams = {
    sqlite: Sqlite;
    publicKey: string;
    ownerId: string;
    size: number; // To be transferred from `publicKey` to the `ownerId`;
};

export const transferSpaceLimitToOwner = ({
    sqlite,
    publicKey,
    ownerId,
    size,
}: TransferSpaceLimitToOwnerParams) => {
    // Todo: this operation is not atomic! Implement some lock/transactionality

    // Checks that publicKey as enough space

    const limitsResult = getLimitsForPubkey({ sqlite, publicKey });

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

    const subtractSizeResult = sqlite.exec<{}>(sql.prepared`
        UPDATE ${sql.identifier(PUBKEY_STORAGE_LIMITS_TABLE_NAME)}
        WHERE "publicKey" = ${publicKey} SET "unspendStorageSize" = "unspendStorageSize" - ${size};
    `);

    if (!subtractSizeResult.ok) {
        return subtractSizeResult;
    }

    // Add size to `ownerId`

    const resultUpsert = sqlite.exec<{}>(sql.prepared`
        INSERT INTO ${sql.identifier(OWNER_STORAGE_LIMITS_TABLE_NAME)} ("ownerId", "storageLimit")
        VALUES (${ownerId}, ${size}) ON CONFLICT("ownerId")
        DO
        UPDATE SET
            "storageLimit" = "storageLimit" + ${size};;
    `);

    if (!resultUpsert.ok) {
        return resultUpsert;
    }

    // Reselect final result

    const reselectResult = getLimitsForOwner({ ownerId, sqlite });

    if (!reselectResult.ok) {
        return reselectResult;
    }

    return ok(reselectResult.value);
};
