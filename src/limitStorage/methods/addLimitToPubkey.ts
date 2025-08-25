import { sql, type Sqlite } from '@evolu/common';
import { PUBKEY_STORAGE_LIMITS_TABLE_NAME } from '../tables.js';

export type AddLimitToPubkeyParams = {
    sqlite: Sqlite;
    publicKey: string;
    size: number; // size to add to the limit
};

export const addLimitToPubkey = ({ sqlite, publicKey, size }: AddLimitToPubkeyParams) => {
    const resultUpsert = sqlite.exec<{}>(sql.prepared`
        INSERT INTO ${sql.identifier(PUBKEY_STORAGE_LIMITS_TABLE_NAME)} ("publicKey", "totalStorageSize", "unspendStorageSize")
        VALUES (${publicKey}, ${size}, ${size}) ON CONFLICT("publicKey")
        DO
        UPDATE SET
            "totalStorageSize" = "totalStorageSize" + ${size},
            "unspendStorageSize" = "unspendStorageSize" + ${size};
    `);

    if (!resultUpsert.ok) {
        console.error('SQL error', resultUpsert.error.error);
        return null;
    }

    const resultSelect = sqlite.exec<{ totalStorageSize: number; unspendStorageSize: number }>(sql`
        select "totalStorageSize", "unspendStorageSize"
        from ${sql.identifier(PUBKEY_STORAGE_LIMITS_TABLE_NAME)} limit 1;
    `);

    if (!resultSelect.ok) {
        console.error('SQL error', resultSelect.error.error);
        return null;
    }

    const [row] = resultSelect.value.rows;

    return row ?? null;
};
