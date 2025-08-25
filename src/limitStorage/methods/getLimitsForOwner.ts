import { sql, type Sqlite } from '@evolu/common';
import { OWNER_STORAGE_LIMITS_TABLE_NAME } from '../tables.js';

export type GetLimitsForOwnerParams = {
    sqlite: Sqlite;
    ownerId: string;
};

export const getLimitsForOwner = ({ sqlite, ownerId }: GetLimitsForOwnerParams) => {
    const result = sqlite.exec<{ storageLimit: number }>(sql`
        select storageLimit
        from ${sql.identifier(OWNER_STORAGE_LIMITS_TABLE_NAME)} limit 1;
    `);

    if (!result.ok) {
        return null;
    }

    const [row] = result.value.rows;

    return row?.storageLimit ?? null;
};
