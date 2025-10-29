import { getOrThrow } from '@evolu/common';
import { assert, describe, expect, it } from 'vitest';

import { addLimitToPubkey } from './addLimitToPubkey.js';
import { getLimitsForPubkey } from './getLimitsForPubkey.js';
import { prepareSqlite } from '../../prepareSqlite.js';
import { PublicKey, Size, createLimitStorage } from '../limitStorage.js';

const PublicKeyABCDEFGH = getOrThrow(PublicKey.from('pubkey_ABCDEFGH'));
const PublicKeyNonExistent = getOrThrow(PublicKey.from('PublicKeyNonExistent'));

const size30 = getOrThrow(Size.from(30));
const size50 = getOrThrow(Size.from(50));
const size100 = getOrThrow(Size.from(100));

const prepareSql = async () => {
    const sqlite = await prepareSqlite({ inMemory: true });
    assert(sqlite.ok);

    // Todo: do not create whole LimitStorage just to create table, refactor
    createLimitStorage({ sqlite: sqlite.value });

    return sqlite.value;
};

describe(getLimitsForPubkey.name, () => {
    it('returns null when publicKey does not exist', async () => {
        const sqlite = await prepareSql();
        const result = getLimitsForPubkey({ sqlite, publicKey: PublicKeyNonExistent });
        assert(result.ok);
        expect(result.value).toBe(null);
    });

    it('returns limits for existing publicKey', async () => {
        const sqlite = await prepareSql();
        addLimitToPubkey({ sqlite, publicKey: PublicKeyABCDEFGH, size: size100 });

        const result = getLimitsForPubkey({ sqlite, publicKey: PublicKeyABCDEFGH });
        assert(result.ok);
        expect(result.value).toEqual({
            totalStorageSize: 100,
            unspendStorageSize: 100,
        });
    });

    it('returns updated limits after multiple adds', async () => {
        const sqlite = await prepareSql();
        addLimitToPubkey({ sqlite, publicKey: PublicKeyABCDEFGH, size: size50 });
        addLimitToPubkey({ sqlite, publicKey: PublicKeyABCDEFGH, size: size30 });

        const result = getLimitsForPubkey({ sqlite, publicKey: PublicKeyABCDEFGH });
        assert(result.ok);
        expect(result.value).toEqual({
            totalStorageSize: 80,
            unspendStorageSize: 80,
        });
    });
});
