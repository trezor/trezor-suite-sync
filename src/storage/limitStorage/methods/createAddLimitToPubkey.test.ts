import { assert, describe, expect, it } from 'vitest';

import { createAddLimitToPubkey } from './createAddLimitToPubkey.js';
import { createGetLimitsForPubkey } from './createGetLimitsForPubkey.js';
import { getOrThrowTest } from '../../../getOrThrowTest.js';
import { createTestDatabase } from '../../postgres/createTestDatabase.js';
import { PublicKey, Size } from '../limitStorage.js';

const PublicKeyAAA = getOrThrowTest(PublicKey.from('pubkey_AAAA'));
const PublicKeyBBB = getOrThrowTest(PublicKey.from('pubkey_BBBB'));
const PublicKeyABCDEFGH = getOrThrowTest(PublicKey.from('pubkey_ABCDEFGH'));

const size0 = getOrThrowTest(Size.from(0));
const size30 = getOrThrowTest(Size.from(30));
const size50 = getOrThrowTest(Size.from(50));
const size100 = getOrThrowTest(Size.from(100));
const size200 = getOrThrowTest(Size.from(200));

describe(createAddLimitToPubkey.name, () => {
    it('adds limit to the pubkey', async () => {
        const db = await createTestDatabase();

        const getLimitsForPubkey = createGetLimitsForPubkey({ db });
        const addLimitToPubkey = createAddLimitToPubkey({ db, getLimitsForPubkey });
        const result = await addLimitToPubkey({
            publicKey: PublicKeyABCDEFGH,
            size: size50,
        });
        assert(result.ok);

        expect(result.value.totalStorageSize).toBe(50);
        expect(result.value.unspentStorageSize).toBe(50);
    });

    it('adds to existing limit for same pubkey', async () => {
        const db = await createTestDatabase();

        const getLimitsForPubkey = createGetLimitsForPubkey({ db });
        const addLimitToPubkey = createAddLimitToPubkey({ db, getLimitsForPubkey });
        await addLimitToPubkey({ publicKey: PublicKeyABCDEFGH, size: size50 });

        const result = await addLimitToPubkey({
            publicKey: PublicKeyABCDEFGH,
            size: size30,
        });
        assert(result.ok);

        expect(result.value.totalStorageSize).toBe(80);
        expect(result.value.unspentStorageSize).toBe(80);
    });

    it('handles zero size addition', async () => {
        const db = await createTestDatabase();

        const getLimitsForPubkey = createGetLimitsForPubkey({ db });
        const addLimitToPubkey = createAddLimitToPubkey({ db, getLimitsForPubkey });
        const result = await addLimitToPubkey({
            publicKey: PublicKeyABCDEFGH,
            size: size0,
        });
        assert(result.ok);

        expect(result.value.totalStorageSize).toBe(0);
        expect(result.value.unspentStorageSize).toBe(0);
    });

    it('handles different pubkeys independently', async () => {
        const db = await createTestDatabase();
        const getLimitsForPubkey = createGetLimitsForPubkey({ db });
        const addLimitToPubkey = createAddLimitToPubkey({ db, getLimitsForPubkey });
        await addLimitToPubkey({ publicKey: PublicKeyAAA, size: size100 });

        const result = await addLimitToPubkey({ publicKey: PublicKeyBBB, size: size200 });
        assert(result.ok);

        expect(result.value.totalStorageSize).toBe(200);
        expect(result.value.unspentStorageSize).toBe(200);
    });
});
