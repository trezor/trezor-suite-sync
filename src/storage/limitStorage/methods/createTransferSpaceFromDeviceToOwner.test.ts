import { OwnerId } from '@evolu/common';
import { assert, describe, expect, it } from 'vitest';

import { createAddLimitToPubkey } from './createAddLimitToPubkey.js';
import { createGetLimitsForOwner } from './createGetLimitsForOwner.js';
import { createGetLimitsForPubkey } from './createGetLimitsForPubkey.js';
import { createTransferSpaceFromDeviceToOwner } from './createTransferSpaceFromDeviceToOwner.js';
import { getOrThrowTest } from '../../../getOrThrowTest.js';
import { createTestDatabase } from '../createTestDatabase.js';
import { PublicKey, Size } from '../limitStorage.js';

const PublicKeyAAA = getOrThrowTest(PublicKey.from('pubkey_AAAA'));

const ownerIdAlice = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJg6g'));
const ownerIdBob = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJg7g'));

const size30 = getOrThrowTest(Size.from(30));
const size50 = getOrThrowTest(Size.from(50));
const size100 = getOrThrowTest(Size.from(100));
const size200 = getOrThrowTest(Size.from(200));

describe(createTransferSpaceFromDeviceToOwner.name, () => {
    it('transfers space from pubkey to owner', async () => {
        const db = await createTestDatabase();

        const getLimitsForPubkey = createGetLimitsForPubkey({ db });
        const getLimitsForOwner = createGetLimitsForOwner({ db });
        const addLimitToPubkey = createAddLimitToPubkey({ db, getLimitsForPubkey });
        const transferSpaceFromDeviceToOwner = createTransferSpaceFromDeviceToOwner({
            db,
            getLimitsForPubkey,
            getLimitsForOwner,
        });

        await addLimitToPubkey({ publicKey: PublicKeyAAA, size: size100 });

        const result = await transferSpaceFromDeviceToOwner({
            publicKey: PublicKeyAAA,
            ownerId: ownerIdAlice,
            size: size50,
        });

        assert(result.ok);
        expect(result.value).toBe(50);

        const pubkeyLimits = await getLimitsForPubkey({ publicKey: PublicKeyAAA });
        assert(pubkeyLimits.ok);
        expect(pubkeyLimits.value?.unspendStorageSize).toBe(50);
    });

    it('returns error when pubkey has no space', async () => {
        const db = await createTestDatabase();

        const getLimitsForPubkey = createGetLimitsForPubkey({ db });
        const getLimitsForOwner = createGetLimitsForOwner({ db });
        const transferSpaceFromDeviceToOwner = createTransferSpaceFromDeviceToOwner({
            db,
            getLimitsForPubkey,
            getLimitsForOwner,
        });

        const result = await transferSpaceFromDeviceToOwner({
            publicKey: PublicKeyAAA,
            ownerId: ownerIdAlice,
            size: size50,
        });

        assert(!result.ok);
        expect(result.error.type).toBe('NoStorageAllowance');
    });

    it('returns error when insufficient unspent space', async () => {
        const db = await createTestDatabase();

        const getLimitsForPubkey = createGetLimitsForPubkey({ db });
        const getLimitsForOwner = createGetLimitsForOwner({ db });
        const addLimitToPubkey = createAddLimitToPubkey({ db, getLimitsForPubkey });
        const transferSpaceFromDeviceToOwner = createTransferSpaceFromDeviceToOwner({
            db,
            getLimitsForPubkey,
            getLimitsForOwner,
        });

        await addLimitToPubkey({ publicKey: PublicKeyAAA, size: size50 });

        const result = await transferSpaceFromDeviceToOwner({
            publicKey: PublicKeyAAA,
            ownerId: ownerIdAlice,
            size: size100,
        });

        assert(!result.ok);
        expect(result.error.type).toBe('NoStorageAllowance');
    });

    it('accumulates space for the same owner', async () => {
        const db = await createTestDatabase();

        const getLimitsForPubkey = createGetLimitsForPubkey({ db });
        const getLimitsForOwner = createGetLimitsForOwner({ db });
        const addLimitToPubkey = createAddLimitToPubkey({ db, getLimitsForPubkey });
        const transferSpaceFromDeviceToOwner = createTransferSpaceFromDeviceToOwner({
            db,
            getLimitsForPubkey,
            getLimitsForOwner,
        });

        await addLimitToPubkey({ publicKey: PublicKeyAAA, size: size200 });

        await transferSpaceFromDeviceToOwner({
            publicKey: PublicKeyAAA,
            ownerId: ownerIdAlice,
            size: size50,
        });

        await transferSpaceFromDeviceToOwner({
            publicKey: PublicKeyAAA,
            ownerId: ownerIdAlice,
            size: size30,
        });

        const ownerAliceLimit = await getLimitsForOwner({ ownerId: ownerIdAlice });
        assert(ownerAliceLimit.ok);
        expect(ownerAliceLimit.value).toBe(80);
    });

    it('handles transfers to different owners independently', async () => {
        const db = await createTestDatabase();

        const getLimitsForPubkey = createGetLimitsForPubkey({ db });
        const getLimitsForOwner = createGetLimitsForOwner({ db });
        const addLimitToPubkey = createAddLimitToPubkey({ db, getLimitsForPubkey });
        const transferSpaceFromDeviceToOwner = createTransferSpaceFromDeviceToOwner({
            db,
            getLimitsForPubkey,
            getLimitsForOwner,
        });

        await addLimitToPubkey({ publicKey: PublicKeyAAA, size: size200 });

        await transferSpaceFromDeviceToOwner({
            publicKey: PublicKeyAAA,
            ownerId: ownerIdAlice,
            size: size50,
        });

        await transferSpaceFromDeviceToOwner({
            publicKey: PublicKeyAAA,
            ownerId: ownerIdBob,
            size: size30,
        });

        const ownerAliceLimit = await getLimitsForOwner({ ownerId: ownerIdAlice });
        console.log(ownerAliceLimit);
        assert(ownerAliceLimit.ok);
        expect(ownerAliceLimit.value).toBe(50);

        const ownerBobLimit = await getLimitsForOwner({ ownerId: ownerIdBob });
        assert(ownerBobLimit.ok);
        expect(ownerBobLimit.value).toBe(30);
    });
});
