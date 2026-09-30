import { describe, expect, it } from 'vitest';

import { createTestDatabase } from './createTestDatabase.js';
import { up as clampNegativeUnspentStorage } from './migrations/002_clamp_negative_unspent_storage.js';
import { PUBKEY_STORAGE_LIMITS_TABLE_NAME } from './tables.js';
import { getOrThrowTest } from '../../getOrThrowTest.js';
import { PublicKey, Size } from '../limitStorage/limitStorage.js';

const overdrawnPublicKey = getOrThrowTest(PublicKey.fromUnknown('pubkey-overdrawn'));
const healthyPublicKey = getOrThrowTest(PublicKey.fromUnknown('pubkey-healthy'));

describe('002_clamp_negative_unspent_storage', () => {
    it('clamps negative unspent storage to zero and leaves other rows untouched', async () => {
        const db = await createTestDatabase();

        await db
            .insertInto(PUBKEY_STORAGE_LIMITS_TABLE_NAME)
            .values([
                {
                    publicKey: overdrawnPublicKey,
                    totalStorageSize: getOrThrowTest(Size.fromUnknown(100)),
                    unspentStorageSize: -30 as Size,
                },
                {
                    publicKey: healthyPublicKey,
                    totalStorageSize: getOrThrowTest(Size.fromUnknown(100)),
                    unspentStorageSize: getOrThrowTest(Size.fromUnknown(40)),
                },
            ])
            .execute();

        await clampNegativeUnspentStorage(db);

        const rows = await db
            .selectFrom(PUBKEY_STORAGE_LIMITS_TABLE_NAME)
            .select(['publicKey', 'totalStorageSize', 'unspentStorageSize'])
            .orderBy('publicKey')
            .execute();

        expect(rows).toEqual([
            {
                publicKey: healthyPublicKey,
                totalStorageSize: 100,
                unspentStorageSize: 40,
            },
            {
                publicKey: overdrawnPublicKey,
                totalStorageSize: 100,
                unspentStorageSize: 0,
            },
        ]);
    });
});
