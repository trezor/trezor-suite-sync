import { ok, type Result, sql, type Sqlite, type SqliteError } from '@evolu/common';
import { PUBKEY_STORAGE_LIMITS_TABLE_NAME } from '../tables.js';

export type GetLimitsForPubkey = {
    sqlite: Sqlite;
    publicKey: string;
};

export type GetLimitsForPubkeyResponse = {
    totalStorageSize: number;
    unspendStorageSize: number;
};

export const getLimitsForPubkey = ({
    sqlite,
}: GetLimitsForPubkey): Result<GetLimitsForPubkeyResponse | null, SqliteError> => {
    const result = sqlite.exec<GetLimitsForPubkeyResponse>(sql`
        select totalStorageSize, unspendStorageSize
        from ${sql.identifier(PUBKEY_STORAGE_LIMITS_TABLE_NAME)} limit 1;
    `);

    if (!result.ok) {
        return result;
    }

    const [row] = result.value.rows;

    return ok(row ?? null);
};
