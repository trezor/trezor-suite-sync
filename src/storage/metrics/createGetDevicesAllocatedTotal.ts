import { Result, ok } from '@evolu/common';

import { toMetricNumber } from './utils.js';
import { AppDatabaseDep } from '../postgres/createPostgreSql.js';
import { PUBKEY_STORAGE_LIMITS_TABLE_NAME } from '../postgres/tables.js';
import { DatabaseError, dbQuery } from '../utils/dbQuery.js';

export type GetDevicesAllocatedTotalDeps = AppDatabaseDep;

export type GetDevicesAllocatedTotal = () => Promise<Result<number, DatabaseError>>;

export type GetDevicesAllocatedTotalDep = {
    getDevicesAllocatedTotal: GetDevicesAllocatedTotal;
};

export const createGetDevicesAllocatedTotal =
    ({ db }: GetDevicesAllocatedTotalDeps): GetDevicesAllocatedTotal =>
    async () => {
        const result = await dbQuery(() =>
            db
                .selectFrom(PUBKEY_STORAGE_LIMITS_TABLE_NAME)
                .select(eb => eb.fn.sum('totalStorageSize').as('totalStorageSizeSum'))
                .executeTakeFirstOrThrow(),
        );

        if (!result.ok) {
            return result;
        }

        return ok(toMetricNumber(result.value.totalStorageSizeSum));
    };
