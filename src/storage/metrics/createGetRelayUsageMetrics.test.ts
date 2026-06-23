import { OwnerId } from '@evolu/common';
import { assert, describe, expect, it } from 'vitest';

import { createGetDevicesCount } from './createGetDevicesCount.js';
import { createGetDevicesUsedTotal } from './createGetDevicesUsedTotal.js';
import { createGetDevicesUsedTotalBreakdown } from './createGetDevicesUsedTotalBreakdown.js';
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
const size950Kb = getOrThrowTest(Size.from(950 * 1024));

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
                { ownerId: ownerIdG, storageLimit: size950Kb },
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
            getDevicesUsedTotal: createGetDevicesUsedTotal({ db }),
            getDevicesUsedTotalBreakdown: createGetDevicesUsedTotalBreakdown({
                db,
            }),
            getOwnersAllocatedTotalBreakdown: createGetOwnersAllocatedTotalBreakdown({ db }),
        });
        const result = await getRelayUsageMetrics();
        assert(result.ok);

        expect(result.value).toEqual({
            ownersCount: 7,
            devicesCount: 2,
            ownersAllocatedTotal: 3_297_780,
            devicesUsedTotal: 1250,
            devicesUsedTotalBreakdown: {
                '0_1B': 0,
                '1B_10KB': 2,
                '10KB_100KB': 0,
                '100KB_200KB': 0,
                '200KB_300KB': 0,
                '300KB_400KB': 0,
                '400KB_500KB': 0,
                '500KB_600KB': 0,
                '600KB_700KB': 0,
                '700KB_800KB': 0,
                '800KB_900KB': 0,
                '900KB_1MB': 0,
                '1MB_plus': 0,
            },
            ownersAllocatedTotalBreakdown: {
                '0_1B': 1,
                '1B_10KB': 2,
                '10KB_100KB': 1,
                '100KB_200KB': 1,
                '200KB_300KB': 0,
                '300KB_400KB': 0,
                '400KB_500KB': 0,
                '500KB_600KB': 0,
                '600KB_700KB': 0,
                '700KB_800KB': 0,
                '800KB_900KB': 0,
                '900KB_1MB': 1,
                '1MB_plus': 1,
            },
        });
    });
});
