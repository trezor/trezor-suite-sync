import { Result, ok } from '@evolu/common';

import { toMetricNumber } from './utils.js';
import { Size } from '../limitStorage/limitStorage.js';
import { AppDatabaseDep } from '../postgres/createPostgreSql.js';
import { OWNER_STORAGE_LIMITS_TABLE_NAME } from '../postgres/tables.js';
import { DatabaseError, dbQuery } from '../utils/dbQuery.js';

export const OWNERS_ALLOCATED_TOTAL_BREAKDOWN_BUCKETS = [
    { label: '0', min: 0, max: 0 },
    { label: '1B_1KB', min: 1, max: 1024 },
    { label: '1KB_10KB', min: 1025, max: 10 * 1024 },
    { label: '10KB_100KB', min: 10 * 1024 + 1, max: 100 * 1024 },
    { label: '100KB_1MB', min: 100 * 1024 + 1, max: 1024 * 1024 },
    { label: '1MB_10MB', min: 1024 * 1024 + 1, max: 10 * 1024 * 1024 },
    { label: '10MB_plus', min: 10 * 1024 * 1024 + 1, max: null },
] as const;

type OwnersAllocatedTotalBreakdownBucket =
    (typeof OWNERS_ALLOCATED_TOTAL_BREAKDOWN_BUCKETS)[number]['label'];

export type GetOwnersAllocatedTotalBreakdownDeps = AppDatabaseDep;

export type OwnersAllocatedTotalBreakdown = Record<OwnersAllocatedTotalBreakdownBucket, number>;

export type GetOwnersAllocatedTotalBreakdown = () => Promise<
    Result<OwnersAllocatedTotalBreakdown, DatabaseError>
>;

export type GetOwnersAllocatedTotalBreakdownDep = {
    getOwnersAllocatedTotalBreakdown: GetOwnersAllocatedTotalBreakdown;
};

export const createGetOwnersAllocatedTotalBreakdown =
    ({ db }: GetOwnersAllocatedTotalBreakdownDeps): GetOwnersAllocatedTotalBreakdown =>
    async () => {
        const result = await dbQuery(async () => {
            const bucketQueries = OWNERS_ALLOCATED_TOTAL_BREAKDOWN_BUCKETS.map(bucket => {
                let query = db
                    .selectFrom(OWNER_STORAGE_LIMITS_TABLE_NAME)
                    .select(eb => eb.fn.countAll().as('count'))
                    .where('storageLimit', '>=', bucket.min as Size);

                if (bucket.max !== null) {
                    query = query.where('storageLimit', '<=', bucket.max as Size);
                }

                return query.executeTakeFirstOrThrow();
            });

            return await Promise.all(bucketQueries);
        });

        if (!result.ok) {
            return result;
        }

        return ok({
            '0': toMetricNumber(result.value[0]?.count),
            '1B_1KB': toMetricNumber(result.value[1]?.count),
            '1KB_10KB': toMetricNumber(result.value[2]?.count),
            '10KB_100KB': toMetricNumber(result.value[3]?.count),
            '100KB_1MB': toMetricNumber(result.value[4]?.count),
            '1MB_10MB': toMetricNumber(result.value[5]?.count),
            '10MB_plus': toMetricNumber(result.value[6]?.count),
        });
    };
