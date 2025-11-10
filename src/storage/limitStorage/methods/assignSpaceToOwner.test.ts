import { assert, describe, expect, it } from 'vitest';
import { OwnerId } from '@evolu/common';

import { assignSpaceToOwner } from './assignSpaceToOwner.js';
import { addLimitToPubkey } from './addLimitToPubkey.js';
import { getOrThrowTest } from '../../../getOrThrowTest.js';
import { prepareSqlite } from '../../prepareSqlite.js';
import { PublicKey, Size, createLimitStorage } from '../limitStorage.js';

const publicKey = getOrThrowTest(PublicKey.from('pubkey-123'));
const ownerId = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJg6g'));
const burnOwnerId = '0' as OwnerId;

const size50 = getOrThrowTest(Size.from(50));
const size30 = getOrThrowTest(Size.from(30));
const size20 = getOrThrowTest(Size.from(20));

const prepareDatabase = async () => {
    const sqlite = await prepareSqlite({ inMemory: true });
    assert(sqlite.ok);

    const storage = createLimitStorage({ sqlite: sqlite.value });
    assert(storage.ok);

    addLimitToPubkey({ sqlite: sqlite.value, publicKey, size: size50 });

    return sqlite.value;
};

describe(assignSpaceToOwner.name, () => {
    it('assigns space from publicKey to owner', async () => {
        const sqlite = await prepareDatabase();

        const result = assignSpaceToOwner({
            sqlite,
            publicKey,
            ownerId,
            size: size20,
        });

        assert(result.ok);

        expect(result.value.publicKeyLimits.unspendStorageSize).toBe(30);
        expect(result.value.ownerStorageLimit).toBe(20);
    });

    it('accumulates owner storage on repeated assignments', async () => {
        const sqlite = await prepareDatabase();

        assignSpaceToOwner({ sqlite, publicKey, ownerId, size: size20 });
        const result = assignSpaceToOwner({ sqlite, publicKey, ownerId, size: size20 });

        assert(result.ok);

        expect(result.value.publicKeyLimits.unspendStorageSize).toBe(10);
        expect(result.value.ownerStorageLimit).toBe(40);
    });

    it('supports burn when ownerId equals zero', async () => {
        const sqlite = await prepareDatabase();

        const result = assignSpaceToOwner({ sqlite, publicKey, ownerId: burnOwnerId, size: size20 });

        assert(result.ok);

        expect(result.value.publicKeyLimits.unspendStorageSize).toBe(30);
        expect(result.value.ownerStorageLimit).toBeNull();
    });

    it('fails when publicKey does not exist', async () => {
        const sqlite = await prepareDatabase();

        const otherPublicKey = getOrThrowTest(PublicKey.from('unknown'));

        const result = assignSpaceToOwner({ sqlite, publicKey: otherPublicKey, ownerId, size: size20 });

        assert(!result.ok);
        if (!result.ok) {
            expect(result.error.type).toBe('NoStorageAllowance');
        }
    });

    it('fails when unspent storage is insufficient', async () => {
        const sqlite = await prepareDatabase();

        const result = assignSpaceToOwner({
            sqlite,
            publicKey,
            ownerId,
            size: size30,
        });
        assert(result.ok);

        const secondResult = assignSpaceToOwner({
            sqlite,
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

