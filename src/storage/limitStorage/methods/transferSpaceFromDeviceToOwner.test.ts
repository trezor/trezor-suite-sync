import { OwnerId } from '@evolu/common';
import { assert, describe, expect, it } from 'vitest';

import { addLimitToPubkey } from './addLimitToPubkey.js';
import { getLimitsForOwner } from './getLimitsForOwner.js';
import { getLimitsForPubkey } from './getLimitsForPubkey.js';
import { transferSpaceFromDeviceToOwner } from './transferSpaceFromDeviceToOwner.js';
import { getOrThrowTest } from '../../../getOrThrowTest.js';
import { PublicKey, Size, createLimitStorage } from '../limitStorage.js';
import { prepareTestDatabase } from '../prepareTestDatabase.js';

const PublicKeyAAA = getOrThrowTest(PublicKey.from('pubkey_AAAA'));

const ownerIdAlice = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJg6g'));
const ownerIdBob = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJg7g'));

const size30 = getOrThrowTest(Size.from(30));
const size50 = getOrThrowTest(Size.from(50));
const size100 = getOrThrowTest(Size.from(100));
const size200 = getOrThrowTest(Size.from(200));

const prepareSql = async () => {
    const db = prepareTestDatabase();

    await createLimitStorage({ db });

    return db;
};

describe(transferSpaceFromDeviceToOwner.name, () => {
    it('transfers space from pubkey to owner', async () => {
        const db = await prepareSql();

        await addLimitToPubkey({ db, publicKey: PublicKeyAAA, size: size100 });

        const result = await transferSpaceFromDeviceToOwner({
            db,
            publicKey: PublicKeyAAA,
            ownerId: ownerIdAlice,
            size: size50,
        });

        assert(result.ok);
        expect(result.value).toBe(50);

        const pubkeyLimits = await getLimitsForPubkey({ db, publicKey: PublicKeyAAA });
        assert(pubkeyLimits.ok);
        expect(pubkeyLimits.value?.unspendStorageSize).toBe(50);
    });

    it('returns error when pubkey has no space', async () => {
        const db = await prepareSql();

        const result = await transferSpaceFromDeviceToOwner({
            db,
            publicKey: PublicKeyAAA,
            ownerId: ownerIdAlice,
            size: size50,
        });

        assert(!result.ok);
        expect(result.error.type).toBe('NoStorageAllowance');
    });

    it('returns error when insufficient unspent space', async () => {
        const db = await prepareSql();

        await addLimitToPubkey({ db, publicKey: PublicKeyAAA, size: size50 });

        const result = await transferSpaceFromDeviceToOwner({
            db,
            publicKey: PublicKeyAAA,
            ownerId: ownerIdAlice,
            size: size100,
        });

        assert(!result.ok);
        expect(result.error.type).toBe('NoStorageAllowance');
    });

    it('accumulates space for the same owner', async () => {
        const db = await prepareSql();

        await addLimitToPubkey({ db, publicKey: PublicKeyAAA, size: size200 });

        await transferSpaceFromDeviceToOwner({
            db,
            publicKey: PublicKeyAAA,
            ownerId: ownerIdAlice,
            size: size50,
        });

        await transferSpaceFromDeviceToOwner({
            db,
            publicKey: PublicKeyAAA,
            ownerId: ownerIdAlice,
            size: size30,
        });

        const ownerAliceLimit = await getLimitsForOwner({ db, ownerId: ownerIdAlice });
        assert(ownerAliceLimit.ok);
        expect(ownerAliceLimit.value).toBe(80);
    });

    it('handles transfers to different owners independently', async () => {
        const db = await prepareSql();

        await addLimitToPubkey({ db, publicKey: PublicKeyAAA, size: size200 });

        await transferSpaceFromDeviceToOwner({
            db,
            publicKey: PublicKeyAAA,
            ownerId: ownerIdAlice,
            size: size50,
        });

        await transferSpaceFromDeviceToOwner({
            db,
            publicKey: PublicKeyAAA,
            ownerId: ownerIdBob,
            size: size30,
        });

        const ownerAliceLimit = await getLimitsForOwner({ db, ownerId: ownerIdAlice });
        assert(ownerAliceLimit.ok);
        expect(ownerAliceLimit.value).toBe(50);

        const ownerBobLimit = await getLimitsForOwner({ db, ownerId: ownerIdBob });
        assert(ownerBobLimit.ok);
        expect(ownerBobLimit.value).toBe(30);
    });
});
