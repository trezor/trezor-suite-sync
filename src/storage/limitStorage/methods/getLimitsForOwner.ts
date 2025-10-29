import { OwnerId, type Sqlite, ok, sql } from '@evolu/common';

import { OWNER_STORAGE_LIMITS_TABLE_NAME } from '../tables.js';

export type GetLimitsForOwnerParams = {
    sqlite: Sqlite;
    ownerId: OwnerId;
};

export const getLimitsForOwner = ({ sqlite, ownerId }: GetLimitsForOwnerParams) => {
    const result = sqlite.exec<{ storageLimit: number }>(sql`
        SELECT storageLimit
        FROM ${sql.identifier(OWNER_STORAGE_LIMITS_TABLE_NAME)}
        WHERE ownerId = ${ownerId} LIMIT 1;
    `);

    if (!result.ok) {
        return result;
    }

    const [row] = result.value.rows;

    return ok(row?.storageLimit ?? null);
};
