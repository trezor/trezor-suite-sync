import { Result, ok } from '@evolu/common';

import { toMetricNumber } from './utils.js';
import { AppDatabaseDep } from '../postgres/createPostgreSql.js';
import { PUBKEY_STORAGE_LIMITS_TABLE_NAME } from '../postgres/tables.js';
import { DatabaseError, dbQuery } from '../utils/dbQuery.js';

export type GetDevicesUnspendTotalDeps = AppDatabaseDep;

export type GetDevicesUnspendTotal = () => Promise<Result<number, DatabaseError>>;

export type GetDevicesUnspendTotalDep = {
    getDevicesUnspendTotal: GetDevicesUnspendTotal;
};

export const createGetDevicesUnspendTotal =
    ({ db }: GetDevicesUnspendTotalDeps): GetDevicesUnspendTotal =>
    async () => {
        const result = await dbQuery(() =>
            db
                .selectFrom(PUBKEY_STORAGE_LIMITS_TABLE_NAME)
                .select(eb => eb.fn.sum('unspentStorageSize').as('unspentStorageSizeSum'))
                .executeTakeFirstOrThrow(),
        );

        if (!result.ok) {
            return result;
        }

        return ok(toMetricNumber(result.value.unspentStorageSizeSum));
    };
