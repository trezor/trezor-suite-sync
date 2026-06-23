import { Result, ok } from '@evolu/common';
import { sql } from 'kysely';

import { toMetricNumber } from './utils.js';
import { Size } from '../limitStorage/limitStorage.js';
import { AppDatabaseDep } from '../postgres/createPostgreSql.js';
import { PUBKEY_STORAGE_LIMITS_TABLE_NAME } from '../postgres/tables.js';
import { DatabaseError, dbQuery } from '../utils/dbQuery.js';

export const DEVICES_USED_TOTAL_BREAKDOWN_BUCKETS = [
    { label: '0_1B', min: 0, max: 0 },
    { label: '1B_10KB', min: 1, max: 10 * 1024 },
    { label: '10KB_100KB', min: 10 * 1024 + 1, max: 100 * 1024 },
    { label: '100KB_200KB', min: 100 * 1024 + 1, max: 200 * 1024 },
    { label: '200KB_300KB', min: 200 * 1024 + 1, max: 300 * 1024 },
    { label: '300KB_400KB', min: 300 * 1024 + 1, max: 400 * 1024 },
    { label: '400KB_500KB', min: 400 * 1024 + 1, max: 500 * 1024 },
    { label: '500KB_600KB', min: 500 * 1024 + 1, max: 600 * 1024 },
    { label: '600KB_700KB', min: 600 * 1024 + 1, max: 700 * 1024 },
    { label: '700KB_800KB', min: 700 * 1024 + 1, max: 800 * 1024 },
    { label: '800KB_900KB', min: 800 * 1024 + 1, max: 900 * 1024 },
    { label: '900KB_1MB', min: 900 * 1024 + 1, max: 1024 * 1024 },
    { label: '1MB_plus', min: 1024 * 1024 + 1, max: null },
] as const;

type DevicesUsedTotalBreakdownBucket =
    (typeof DEVICES_USED_TOTAL_BREAKDOWN_BUCKETS)[number]['label'];

export type GetDevicesUsedTotalBreakdownDeps = AppDatabaseDep;

export type DevicesUsedTotalBreakdown = Record<DevicesUsedTotalBreakdownBucket, number>;

export type GetDevicesUsedTotalBreakdown = () => Promise<
    Result<DevicesUsedTotalBreakdown, DatabaseError>
>;

export type GetDevicesUsedTotalBreakdownDep = {
    getDevicesUsedTotalBreakdown: GetDevicesUsedTotalBreakdown;
};

export const createGetDevicesUsedTotalBreakdown =
    ({ db }: GetDevicesUsedTotalBreakdownDeps): GetDevicesUsedTotalBreakdown =>
    async () => {
        const result = await dbQuery(async () => {
            const bucketQueries = DEVICES_USED_TOTAL_BREAKDOWN_BUCKETS.map(bucket => {
                let query = db
                    .selectFrom(PUBKEY_STORAGE_LIMITS_TABLE_NAME)
                    .select(eb => eb.fn.countAll().as('count'))
                    .where(eb => {
                        const usedStorageSize = sql<number>`${eb.ref(
                            'totalStorageSize',
                        )} - ${eb.ref('unspentStorageSize')}`;

                        return eb(usedStorageSize, '>=', bucket.min as Size);
                    });

                if (bucket.max !== null) {
                    query = query.where(eb => {
                        const usedStorageSize = sql<number>`${eb.ref(
                            'totalStorageSize',
                        )} - ${eb.ref('unspentStorageSize')}`;

                        return eb(usedStorageSize, '<=', bucket.max as Size);
                    });
                }

                return query.executeTakeFirstOrThrow();
            });

            return await Promise.all(bucketQueries);
        });

        if (!result.ok) {
            return result;
        }

        return ok({
            '0_1B': toMetricNumber(result.value[0]?.count),
            '1B_10KB': toMetricNumber(result.value[1]?.count),
            '10KB_100KB': toMetricNumber(result.value[2]?.count),
            '100KB_200KB': toMetricNumber(result.value[3]?.count),
            '200KB_300KB': toMetricNumber(result.value[4]?.count),
            '300KB_400KB': toMetricNumber(result.value[5]?.count),
            '400KB_500KB': toMetricNumber(result.value[6]?.count),
            '500KB_600KB': toMetricNumber(result.value[7]?.count),
            '600KB_700KB': toMetricNumber(result.value[8]?.count),
            '700KB_800KB': toMetricNumber(result.value[9]?.count),
            '800KB_900KB': toMetricNumber(result.value[10]?.count),
            '900KB_1MB': toMetricNumber(result.value[11]?.count),
            '1MB_plus': toMetricNumber(result.value[12]?.count),
        });
    };
