import { type Result, type Sqlite, type SqliteError, ok, sql } from '@evolu/common';

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
    publicKey,
}: GetLimitsForPubkey): Result<GetLimitsForPubkeyResponse | null, SqliteError> => {
    const result = sqlite.exec<GetLimitsForPubkeyResponse>(sql`
        SELECT totalStorageSize, unspendStorageSize
        FROM ${sql.identifier(PUBKEY_STORAGE_LIMITS_TABLE_NAME)}
        WHERE publicKey=${publicKey} 
        LIMIT 1;
    `);

    if (!result.ok) {
        return result;
    }

    const [row] = result.value.rows;

    return ok(row ?? null);
};
