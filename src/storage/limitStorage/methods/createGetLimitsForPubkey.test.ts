import { assert, describe, expect, it } from 'vitest';

import { createAddLimitToPubkey } from './createAddLimitToPubkey.js';
import { createGetLimitsForPubkey } from './createGetLimitsForPubkey.js';
import { getOrThrowTest } from '../../../getOrThrowTest.js';
import { createTestDatabase } from '../createTestDatabase.js';
import { PublicKey, Size } from '../limitStorage.js';

const PublicKeyABCDEFGH = getOrThrowTest(PublicKey.from('pubkey_ABCDEFGH'));
const PublicKeyNonExistent = getOrThrowTest(PublicKey.from('PublicKeyNonExistent'));

const size30 = getOrThrowTest(Size.from(30));
const size50 = getOrThrowTest(Size.from(50));
const size100 = getOrThrowTest(Size.from(100));

describe(createGetLimitsForPubkey.name, () => {
    it('returns null when publicKey does not exist', async () => {
        const db = await createTestDatabase();
        const getLimitsForPubkey = createGetLimitsForPubkey({ db });
        const result = await getLimitsForPubkey({ publicKey: PublicKeyNonExistent });
        assert(result.ok);
        expect(result.value).toBe(null);
    });

    it('returns limits for existing publicKey', async () => {
        const db = await createTestDatabase();
        const getLimitsForPubkey = createGetLimitsForPubkey({ db });
        const addLimitToPubkey = createAddLimitToPubkey({ db, getLimitsForPubkey });
        await addLimitToPubkey({ publicKey: PublicKeyABCDEFGH, size: size100 });

        const result = await getLimitsForPubkey({ publicKey: PublicKeyABCDEFGH });
        assert(result.ok);
        expect(result.value).toEqual({
            totalStorageSize: 100,
            unspendStorageSize: 100,
        });
    });

    it('returns updated limits after multiple adds', async () => {
        const db = await createTestDatabase();
        const getLimitsForPubkey = createGetLimitsForPubkey({ db });
        const addLimitToPubkey = createAddLimitToPubkey({ db, getLimitsForPubkey });
        await addLimitToPubkey({ publicKey: PublicKeyABCDEFGH, size: size50 });
        await addLimitToPubkey({ publicKey: PublicKeyABCDEFGH, size: size30 });

        const result = await getLimitsForPubkey({ publicKey: PublicKeyABCDEFGH });
        assert(result.ok);
        expect(result.value).toEqual({
            totalStorageSize: 80,
            unspendStorageSize: 80,
        });
    });
});
