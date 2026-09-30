import { OwnerId, err, ok } from '@evolu/common';
import { assert, describe, expect, it } from 'vitest';

import { getOrThrowTest } from '../../../getOrThrowTest.js';
import { createTestDatabase } from '../../postgres/createTestDatabase.js';
import { PublicKey, Size } from '../limitStorage.js';
import { createAddLimitToPubkey } from './createAddLimitToPubkey.js';
import { createAssignSpaceToOwner } from './createAssignSpaceToOwner.js';
import { GetLimitsForOwner, createGetLimitsForOwner } from './createGetLimitsForOwner.js';
import { GetLimitsForPubkey, createGetLimitsForPubkey } from './createGetLimitsForPubkey.js';

const publicKey = getOrThrowTest(PublicKey.fromUnknown('pubkey-123'));
const ownerId = getOrThrowTest(OwnerId.fromUnknown('StbvdTPxk80z0cNVwDJg6g'));
const burnOwnerId = '0' as OwnerId;

const size50 = getOrThrowTest(Size.fromUnknown(50));
const size30 = getOrThrowTest(Size.fromUnknown(30));
const size20 = getOrThrowTest(Size.fromUnknown(20));
const size80 = getOrThrowTest(Size.fromUnknown(80));
const size1000 = getOrThrowTest(Size.fromUnknown(1000));

const prepareDatabase = async () => {
    const db = await createTestDatabase();

    const getLimitsForPubkey = createGetLimitsForPubkey({ db });
    const addLimitToPubkey = createAddLimitToPubkey({ db, getLimitsForPubkey });
    await addLimitToPubkey({ publicKey, size: size50 });

    return db;
};

describe(createAssignSpaceToOwner.name, () => {
    it('assigns space from publicKey to owner', async () => {
        const db = await prepareDatabase();

        const getLimitsForPubkey = createGetLimitsForPubkey({ db });
        const getLimitsForOwner = createGetLimitsForOwner({ db });
        const assignSpaceToOwner = createAssignSpaceToOwner({
            db,
            getLimitsForPubkey,
            getLimitsForOwner,
        });

        const result = await assignSpaceToOwner({
            publicKey,
            ownerId,
            size: size20,
        });

        assert(result.ok);

        expect(result.value.publicKeyLimits.unspentStorageSize).toBe(30);
        expect(result.value.ownerStorageLimit).toBe(20);
    });

    it('accumulates owner storage on repeated assignments', async () => {
        const db = await prepareDatabase();

        const getLimitsForPubkey = createGetLimitsForPubkey({ db });
        const getLimitsForOwner = createGetLimitsForOwner({ db });
        const assignSpaceToOwner = createAssignSpaceToOwner({
            db,
            getLimitsForPubkey,
            getLimitsForOwner,
        });

        await assignSpaceToOwner({ publicKey, ownerId, size: size20 });
        const result = await assignSpaceToOwner({ publicKey, ownerId, size: size20 });

        assert(result.ok);

        expect(result.value.publicKeyLimits.unspentStorageSize).toBe(10);
        expect(result.value.ownerStorageLimit).toBe(40);
    });

    it('supports burn when ownerId equals zero', async () => {
        const db = await prepareDatabase();

        const getLimitsForPubkey = createGetLimitsForPubkey({ db });
        const getLimitsForOwner = createGetLimitsForOwner({ db });
        const assignSpaceToOwner = createAssignSpaceToOwner({
            db,
            getLimitsForPubkey,
            getLimitsForOwner,
        });
        const result = await assignSpaceToOwner({
            publicKey,
            ownerId: burnOwnerId,
            size: size20,
        });

        assert(result.ok);

        expect(result.value.publicKeyLimits.unspentStorageSize).toBe(30);
        expect(result.value.ownerStorageLimit).toBeNull();
    });

    it('fails when publicKey does not exist', async () => {
        const db = await prepareDatabase();

        const otherPublicKey = getOrThrowTest(PublicKey.fromUnknown('unknown'));

        const getLimitsForPubkey = createGetLimitsForPubkey({ db });
        const getLimitsForOwner = createGetLimitsForOwner({ db });
        const assignSpaceToOwner = createAssignSpaceToOwner({
            db,
            getLimitsForPubkey,
            getLimitsForOwner,
        });
        const result = await assignSpaceToOwner({
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

        const getLimitsForPubkey = createGetLimitsForPubkey({ db });
        const getLimitsForOwner = createGetLimitsForOwner({ db });
        const assignSpaceToOwner = createAssignSpaceToOwner({
            db,
            getLimitsForPubkey,
            getLimitsForOwner,
        });
        const result = await assignSpaceToOwner({
            publicKey,
            ownerId,
            size: size30,
        });
        assert(result.ok);

        const secondResult = await assignSpaceToOwner({
            publicKey,
            ownerId,
            size: size30,
        });

        assert(!secondResult.ok);
        if (!secondResult.ok) {
            expect(secondResult.error.type).toBe('NoStorageAllowance');
        }
    });

    it('credits the owner only for the assignment that succeeded', async () => {
        const db = await prepareDatabase();

        const getLimitsForPubkey = createGetLimitsForPubkey({ db });
        const getLimitsForOwner = createGetLimitsForOwner({ db });
        const assignSpaceToOwner = createAssignSpaceToOwner({
            db,
            getLimitsForPubkey,
            getLimitsForOwner,
        });

        const firstResult = await assignSpaceToOwner({ publicKey, ownerId, size: size30 });
        assert(firstResult.ok);

        const secondResult = await assignSpaceToOwner({ publicKey, ownerId, size: size30 });
        assert(!secondResult.ok);
        expect(secondResult.error.type).toBe('NoStorageAllowance');

        const ownerLimit = await getLimitsForOwner({ ownerId });
        assert(ownerLimit.ok);
        expect(ownerLimit.value).toBe(30);

        const pubkeyLimits = await getLimitsForPubkey({ publicKey });
        assert(pubkeyLimits.ok);
        expect(pubkeyLimits.value?.unspentStorageSize).toBe(20);
    });

    it('lets only one of two concurrent assignments spend the same space', async () => {
        const db = await prepareDatabase();

        const getLimitsForPubkey = createGetLimitsForPubkey({ db });
        const getLimitsForOwner = createGetLimitsForOwner({ db });
        const assignSpaceToOwner = createAssignSpaceToOwner({
            db,
            getLimitsForPubkey,
            getLimitsForOwner,
        });

        // Only one of the two can fit into the 50 bytes the publicKey holds.
        const [first, second] = await Promise.all([
            assignSpaceToOwner({ publicKey, ownerId, size: size30 }),
            assignSpaceToOwner({ publicKey, ownerId, size: size30 }),
        ]);

        assert(first.ok);
        expect(first.value.publicKeyLimits.unspentStorageSize).toBe(20);
        expect(first.value.ownerStorageLimit).toBe(30);

        assert(!second.ok);
        expect(second.error.type).toBe('NoStorageAllowance');

        const pubkeyLimits = await getLimitsForPubkey({ publicKey });
        assert(pubkeyLimits.ok);
        expect(pubkeyLimits.value?.unspentStorageSize).toBe(20);

        const ownerLimit = await getLimitsForOwner({ ownerId });
        assert(ownerLimit.ok);
        expect(ownerLimit.value).toBe(30);
    });
    it('rejects at the guarded update when the pre-check read is stale', async () => {
        const db = await prepareDatabase();

        const getLimitsForPubkey = createGetLimitsForPubkey({ db });
        const getLimitsForOwner = createGetLimitsForOwner({ db });
        // Reports far more space than the row holds, the way a read that went stale under a
        // concurrent debit would, so only the guard in the UPDATE can stop the overdraw.
        const staleGetLimitsForPubkey: GetLimitsForPubkey = () =>
            Promise.resolve(ok({ totalStorageSize: size1000, unspentStorageSize: size1000 }));
        const assignSpaceToOwner = createAssignSpaceToOwner({
            db,
            getLimitsForPubkey: staleGetLimitsForPubkey,
            getLimitsForOwner,
        });

        const result = await assignSpaceToOwner({ publicKey, ownerId, size: size80 });

        assert(!result.ok);
        expect(result.error.type).toBe('NoStorageAllowance');

        const pubkeyLimits = await getLimitsForPubkey({ publicKey });
        assert(pubkeyLimits.ok);
        expect(pubkeyLimits.value?.unspentStorageSize).toBe(50);

        const ownerLimit = await getLimitsForOwner({ ownerId });
        assert(ownerLimit.ok);
        expect(ownerLimit.value).toBeNull();
    });

    it('rolls back the debit when crediting the owner fails', async () => {
        const db = await prepareDatabase();

        const getLimitsForPubkey = createGetLimitsForPubkey({ db });
        const getLimitsForOwner = createGetLimitsForOwner({ db });
        const failingGetLimitsForOwner: GetLimitsForOwner = () =>
            Promise.resolve(
                err({ type: 'DatabaseError', error: new Error('owner lookup failed') }),
            );
        const assignSpaceToOwner = createAssignSpaceToOwner({
            db,
            getLimitsForPubkey,
            getLimitsForOwner: failingGetLimitsForOwner,
        });

        const result = await assignSpaceToOwner({ publicKey, ownerId, size: size20 });

        assert(!result.ok);
        expect(result.error.type).toBe('DatabaseError');

        const pubkeyLimits = await getLimitsForPubkey({ publicKey });
        assert(pubkeyLimits.ok);
        expect(pubkeyLimits.value?.unspentStorageSize).toBe(50);

        const ownerLimit = await getLimitsForOwner({ ownerId });
        assert(ownerLimit.ok);
        expect(ownerLimit.value).toBeNull();
    });
});
