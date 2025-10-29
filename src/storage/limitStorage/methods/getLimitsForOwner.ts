import { type Sqlite, ok, sql } from '@evolu/common';

import { OWNER_STORAGE_LIMITS_TABLE_NAME } from '../tables.js';

export type GetLimitsForOwnerParams = {
    sqlite: Sqlite;
    ownerId: string;
};

export const getLimitsForOwner = ({ sqlite, ownerId }: GetLimitsForOwnerParams) => {
    const result = sqlite.exec<{ storageLimit: number }>(sql`
        select storageLimit
        from ${sql.identifier(OWNER_STORAGE_LIMITS_TABLE_NAME)}
        where ownerId = ${ownerId}
        limit 1;
    `);

    if (!result.ok) {
        return result;
    }

    const [row] = result.value.rows;

    return ok(row?.storageLimit ?? null);
};
