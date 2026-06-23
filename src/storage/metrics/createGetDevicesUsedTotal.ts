import { Result, ok } from '@evolu/common';
import { sql } from 'kysely';

import { toMetricNumber } from './utils.js';
import { AppDatabaseDep } from '../postgres/createPostgreSql.js';
import { PUBKEY_STORAGE_LIMITS_TABLE_NAME } from '../postgres/tables.js';
import { DatabaseError, dbQuery } from '../utils/dbQuery.js';

export type GetDevicesUsedTotalDeps = AppDatabaseDep;

export type GetDevicesUsedTotal = () => Promise<Result<number, DatabaseError>>;

export type GetDevicesUsedTotalDep = {
    getDevicesUsedTotal: GetDevicesUsedTotal;
};

export const createGetDevicesUsedTotal =
    ({ db }: GetDevicesUsedTotalDeps): GetDevicesUsedTotal =>
    async () => {
        const result = await dbQuery(() =>
            db
                .selectFrom(PUBKEY_STORAGE_LIMITS_TABLE_NAME)
                .select(eb =>
                    eb.fn
                        .sum(
                            sql<number>`${eb.ref('totalStorageSize')} - ${eb.ref(
                                'unspentStorageSize',
                            )}`,
                        )
                        .as('usedStorageSizeSum'),
                )
                .executeTakeFirstOrThrow(),
        );

        if (!result.ok) {
            return result;
        }

        return ok(toMetricNumber(result.value.usedStorageSizeSum));
    };
