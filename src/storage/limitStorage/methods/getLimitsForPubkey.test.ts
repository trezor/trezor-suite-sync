import { assert, describe, expect, it } from 'vitest';

import { addLimitToPubkey } from './addLimitToPubkey.js';
import { getLimitsForPubkey } from './getLimitsForPubkey.js';
import { getOrThrowTest } from '../../../getOrThrowTest.js';
import { PublicKey, Size, createLimitStorage } from '../limitStorage.js';
import { prepareTestDatabase } from '../prepareTestDatabase.js';

const PublicKeyABCDEFGH = getOrThrowTest(PublicKey.from('pubkey_ABCDEFGH'));
const PublicKeyNonExistent = getOrThrowTest(PublicKey.from('PublicKeyNonExistent'));

const size30 = getOrThrowTest(Size.from(30));
const size50 = getOrThrowTest(Size.from(50));
const size100 = getOrThrowTest(Size.from(100));

const prepareSql = () => {
    const db = prepareTestDatabase();

    // Todo: do not create whole LimitStorage just to create table, refactor
    createLimitStorage({ db });

    return db;
};

describe(getLimitsForPubkey.name, () => {
    it('returns null when publicKey does not exist', async () => {
        const db = prepareSql();
        const result = await getLimitsForPubkey({ db, publicKey: PublicKeyNonExistent });
        assert(result.ok);
        expect(result.value).toBe(null);
    });

    it('returns limits for existing publicKey', async () => {
        const db = prepareSql();
        addLimitToPubkey({ db, publicKey: PublicKeyABCDEFGH, size: size100 });

        const result = await getLimitsForPubkey({ db, publicKey: PublicKeyABCDEFGH });
        assert(result.ok);
        expect(result.value).toEqual({
            totalStorageSize: 100,
            unspendStorageSize: 100,
        });
    });

    it('returns updated limits after multiple adds', async () => {
        const db = prepareSql();
        addLimitToPubkey({ db, publicKey: PublicKeyABCDEFGH, size: size50 });
        addLimitToPubkey({ db, publicKey: PublicKeyABCDEFGH, size: size30 });

        const result = await getLimitsForPubkey({ db, publicKey: PublicKeyABCDEFGH });
        assert(result.ok);
        expect(result.value).toEqual({
            totalStorageSize: 80,
            unspendStorageSize: 80,
        });
    });
});
