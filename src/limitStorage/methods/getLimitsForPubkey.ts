import { sql, type Sqlite } from '@evolu/common';
import { PUBKEY_STORAGE_LIMITS_TABLE_NAME } from '../tables.js';

export type GetLimitsForPubkey = {
    sqlite: Sqlite;
    publicKey: string;
};

export const getLimitsForPubkey = ({ sqlite }: GetLimitsForPubkey) => {
    const result = sqlite.exec<{ totalStorageSize: number; unspendStorageSize: number }>(sql`
        select totalStorageSize, unspendStorageSize
        from ${sql.identifier(PUBKEY_STORAGE_LIMITS_TABLE_NAME)} limit 1;
    `);

    if (!result.ok) {
        return null;
    }

    const [row] = result.value.rows;

    return row ?? null;
};
