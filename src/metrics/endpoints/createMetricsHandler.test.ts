import { OwnerId } from '@evolu/common';
import fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import { createMetricsHandler } from './createMetricsHandler.js';
import { getOrThrowTest } from '../../getOrThrowTest.js';
import { PublicKey, Size } from '../../storage/limitStorage/limitStorage.js';
import { createGetDevicesCount } from '../../storage/metrics/createGetDevicesCount.js';
import { createGetDevicesUsedTotal } from '../../storage/metrics/createGetDevicesUsedTotal.js';
import { createGetDevicesUsedTotalBreakdown } from '../../storage/metrics/createGetDevicesUsedTotalBreakdown.js';
import { createGetOwnersAllocatedTotal } from '../../storage/metrics/createGetOwnersAllocatedTotal.js';
import { createGetOwnersAllocatedTotalBreakdown } from '../../storage/metrics/createGetOwnersAllocatedTotalBreakdown.js';
import { createGetOwnersCount } from '../../storage/metrics/createGetOwnersCount.js';
import { createGetRelayUsageMetrics } from '../../storage/metrics/createGetRelayUsageMetrics.js';
import { createTestDatabase } from '../../storage/postgres/createTestDatabase.js';
import { createMetricsOperation } from '../createMetricsOperation.js';

const privateOwnerId = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJg6g'));
const privatePublicKey = getOrThrowTest(PublicKey.from('private-device-public-key-alpha'));

describe(createMetricsHandler.name, () => {
    it('returns prometheus metrics without owner or device identifiers', async () => {
        const db = await createTestDatabase();

        await db
            .insertInto('owner_storage_limits')
            .values({
                ownerId: privateOwnerId,
                storageLimit: getOrThrowTest(Size.from(2048)),
            })
            .execute();

        await db
            .insertInto('pubkey_storage_limits')
            .values({
                publicKey: privatePublicKey,
                totalStorageSize: getOrThrowTest(Size.from(4096)),
                unspentStorageSize: getOrThrowTest(Size.from(1024)),
            })
            .execute();

        const getRelayUsageMetrics = createGetRelayUsageMetrics({
            getOwnersCount: createGetOwnersCount({ db }),
            getDevicesCount: createGetDevicesCount({ db }),
            getOwnersAllocatedTotal: createGetOwnersAllocatedTotal({ db }),
            getDevicesUsedTotal: createGetDevicesUsedTotal({ db }),
            getDevicesUsedTotalBreakdown: createGetDevicesUsedTotalBreakdown({
                db,
            }),
            getOwnersAllocatedTotalBreakdown: createGetOwnersAllocatedTotalBreakdown({ db }),
        });
        const metricsOperation = createMetricsOperation({ getRelayUsageMetrics });
        const metricsHandler = createMetricsHandler({ metricsOperation });

        const app = fastify();
        app.get('/metrics', metricsHandler);

        const response = await app.inject({
            method: 'GET',
            url: '/metrics',
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toContain('text/plain');
        expect(response.body).toContain('trezor_suite_sync_owners_count 1');
        expect(response.body).toContain('trezor_suite_sync_devices_count 1');
        expect(response.body).toContain('trezor_suite_sync_owners_allocated_total 2048');
        expect(response.body).toContain('trezor_suite_sync_devices_used_total 3072');
        expect(response.body).toContain(
            'trezor_suite_sync_owners_allocated_total_breakdown{bucket="1B_10KB"} 1',
        );
        expect(response.body).toContain(
            'trezor_suite_sync_devices_used_total_breakdown{bucket="1B_10KB"} 1',
        );
        expect(response.body).not.toContain(privateOwnerId);
        expect(response.body).not.toContain(privatePublicKey);

        await db
            .updateTable('owner_storage_limits')
            .set({ storageLimit: getOrThrowTest(Size.from(4096)) })
            .where('ownerId', '=', privateOwnerId)
            .execute();

        const secondResponse = await app.inject({
            method: 'GET',
            url: '/metrics',
        });

        expect(secondResponse.statusCode).toBe(200);
        expect(secondResponse.body).toContain('trezor_suite_sync_owners_allocated_total 4096');
    });
});
