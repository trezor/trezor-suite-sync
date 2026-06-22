import { OwnerId } from '@evolu/common';
import { assert, describe, expect, it } from 'vitest';

import { createGetDevicesAllocatedTotal } from './createGetDevicesAllocatedTotal.js';
import { createGetDevicesCount } from './createGetDevicesCount.js';
import { createGetDevicesUnspendTotal } from './createGetDevicesUnspendTotal.js';
import { createGetOwnersAllocatedTotal } from './createGetOwnersAllocatedTotal.js';
import { createGetOwnersAllocatedTotalBreakdown } from './createGetOwnersAllocatedTotalBreakdown.js';
import { createGetOwnersCount } from './createGetOwnersCount.js';
import { createGetRelayUsageMetrics } from './createGetRelayUsageMetrics.js';
import { getOrThrowTest } from '../../getOrThrowTest.js';
import { PublicKey, Size } from '../limitStorage/limitStorage.js';
import { createTestDatabase } from '../postgres/createTestDatabase.js';

const ownerIdA = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJg6g'));
const ownerIdB = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJg7g'));
const ownerIdC = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJg8g'));
const ownerIdD = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJg9g'));
const ownerIdE = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJgag'));
const ownerIdF = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJgbg'));
const ownerIdG = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJgcg'));

const publicKeyA = getOrThrowTest(PublicKey.from('private-device-public-key-alpha'));
const publicKeyB = getOrThrowTest(PublicKey.from('private-device-public-key-beta'));

const size0 = getOrThrowTest(Size.from(0));
const size500 = getOrThrowTest(Size.from(500));
const size2Kb = getOrThrowTest(Size.from(2 * 1024));
const size20Kb = getOrThrowTest(Size.from(20 * 1024));
const size200Kb = getOrThrowTest(Size.from(200 * 1024));
const size2Mb = getOrThrowTest(Size.from(2 * 1024 * 1024));
const size11Mb = getOrThrowTest(Size.from(11 * 1024 * 1024));

describe(createGetRelayUsageMetrics.name, () => {
    it('returns only aggregate relay usage metrics', async () => {
        const db = await createTestDatabase();

        await db
            .insertInto('owner_storage_limits')
            .values([
                { ownerId: ownerIdA, storageLimit: size0 },
                { ownerId: ownerIdB, storageLimit: size500 },
                { ownerId: ownerIdC, storageLimit: size2Kb },
                { ownerId: ownerIdD, storageLimit: size20Kb },
                { ownerId: ownerIdE, storageLimit: size200Kb },
                { ownerId: ownerIdF, storageLimit: size2Mb },
                { ownerId: ownerIdG, storageLimit: size11Mb },
            ])
            .execute();

        await db
            .insertInto('pubkey_storage_limits')
            .values([
                {
                    publicKey: publicKeyA,
                    totalStorageSize: getOrThrowTest(Size.from(1000)),
                    unspentStorageSize: getOrThrowTest(Size.from(250)),
                },
                {
                    publicKey: publicKeyB,
                    totalStorageSize: getOrThrowTest(Size.from(2000)),
                    unspentStorageSize: getOrThrowTest(Size.from(1500)),
                },
            ])
            .execute();

        const getRelayUsageMetrics = createGetRelayUsageMetrics({
            getOwnersCount: createGetOwnersCount({ db }),
            getDevicesCount: createGetDevicesCount({ db }),
            getOwnersAllocatedTotal: createGetOwnersAllocatedTotal({ db }),
            getDevicesAllocatedTotal: createGetDevicesAllocatedTotal({ db }),
            getDevicesUnspendTotal: createGetDevicesUnspendTotal({
                db,
            }),
            getOwnersAllocatedTotalBreakdown: createGetOwnersAllocatedTotalBreakdown({ db }),
        });
        const result = await getRelayUsageMetrics();
        assert(result.ok);

        expect(result.value).toEqual({
            ownersCount: 7,
            devicesCount: 2,
            ownersAllocatedTotal: 13_859_316,
            devicesAllocatedTotal: 3000,
            devicesUnspendTotal: 1750,
            ownersAllocatedTotalBreakdown: {
                '0': 1,
                '1B_1KB': 1,
                '1KB_10KB': 1,
                '10KB_100KB': 1,
                '100KB_1MB': 1,
                '1MB_10MB': 1,
                '10MB_plus': 1,
            },
        });
    });
});
