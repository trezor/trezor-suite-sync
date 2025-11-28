import { OwnerId } from '@evolu/common';
import { assert, describe, expect, it } from 'vitest';

import { addLimitToPubkey } from './addLimitToPubkey.js';
import { assignSpaceToOwner } from './assignSpaceToOwner.js';
import { getOrThrowTest } from '../../../getOrThrowTest.js';
import { PublicKey, Size, createLimitStorage } from '../limitStorage.js';
import { prepareTestDatabase } from '../prepareTestDatabase.js';

const publicKey = getOrThrowTest(PublicKey.from('pubkey-123'));
const ownerId = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJg6g'));
const burnOwnerId = '0' as OwnerId;

const size50 = getOrThrowTest(Size.from(50));
const size30 = getOrThrowTest(Size.from(30));
const size20 = getOrThrowTest(Size.from(20));

const prepareDatabase = async () => {
    const db = await prepareTestDatabase();

    const storage = await createLimitStorage({ db });
    assert(storage.ok);

    addLimitToPubkey({ db, publicKey, size: size50 });

    return db;
};

describe(assignSpaceToOwner.name, () => {
    it('assigns space from publicKey to owner', async () => {
        const db = await prepareDatabase();

        const result = await assignSpaceToOwner({
            db,
            publicKey,
            ownerId,
            size: size20,
        });

        assert(result.ok);

        expect(result.value.publicKeyLimits.unspendStorageSize).toBe(30);
        expect(result.value.ownerStorageLimit).toBe(20);
    });

    it('accumulates owner storage on repeated assignments', async () => {
        const db = await prepareDatabase();

        await assignSpaceToOwner({ db, publicKey, ownerId, size: size20 });
        const result = await assignSpaceToOwner({ db, publicKey, ownerId, size: size20 });

        assert(result.ok);

        expect(result.value.publicKeyLimits.unspendStorageSize).toBe(10);
        expect(result.value.ownerStorageLimit).toBe(40);
    });

    it('supports burn when ownerId equals zero', async () => {
        const db = await prepareDatabase();

        const result = await assignSpaceToOwner({
            db,
            publicKey,
            ownerId: burnOwnerId,
            size: size20,
        });

        assert(result.ok);

        expect(result.value.publicKeyLimits.unspendStorageSize).toBe(30);
        expect(result.value.ownerStorageLimit).toBeNull();
    });

    it('fails when publicKey does not exist', async () => {
        const db = await prepareDatabase();

        const otherPublicKey = getOrThrowTest(PublicKey.from('unknown'));

        const result = await assignSpaceToOwner({
            db,
            publicKey: otherPublicKey,
            ownerId,
            size: size20,
        });

        assert(!result.ok);
        if (!result.ok) {
            expect(result.error.type).toBe('NoStorageAllowance');
        }
    });

    it('fails when unspent storage is insufficient', async () => {
        const db = await prepareDatabase();

        const result = await assignSpaceToOwner({
            db,
            publicKey,
            ownerId,
            size: size30,
        });
        assert(result.ok);

        const secondResult = await assignSpaceToOwner({
            db,
            publicKey,
            ownerId,
            size: size30,
        });

        assert(!secondResult.ok);
        if (!secondResult.ok) {
            expect(secondResult.error.type).toBe('NoStorageAllowance');
        }
    });
});
