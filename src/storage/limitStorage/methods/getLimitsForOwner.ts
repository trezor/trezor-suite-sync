import { OwnerId, ok } from '@evolu/common';

import { dbQuery } from '../../utils/dbQuery.js';
import { LimitStorageDatabase } from '../preparePostgreSql.js';
import { OWNER_STORAGE_LIMITS_TABLE_NAME } from '../tables.js';

export type GetLimitsForOwnerParams = {
    db: LimitStorageDatabase;
    ownerId: OwnerId;
};

export const getLimitsForOwner = async ({ db, ownerId }: GetLimitsForOwnerParams) => {
    const result = await dbQuery(() =>
        db
            .selectFrom(OWNER_STORAGE_LIMITS_TABLE_NAME)
            .where('ownerId', '=', ownerId)
            .select(['storageLimit'])
            .limit(1)
            .executeTakeFirst(),
    );

    if (!result.ok) {
        return result;
    }

    const row = result.value;

    return ok(row?.storageLimit ?? null);
};
