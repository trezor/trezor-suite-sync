import { assert, describe, expect, it } from 'vitest';

import { prepareSqlite } from '../../prepareSqlite.js';
import { createLimitStorage } from '../limitStorage.js';
import { addLimitToPubkey } from './addLimitToPubkey.js';

const prepareSql = async () => {
    const sqlite = await prepareSqlite({ inMemory: true });
    assert(sqlite.ok);

    // Todo: do not create whole LimitStorage just to create table, refactor
    createLimitStorage({ sqlite: sqlite.value });

    return sqlite.value;
};

describe(addLimitToPubkey.name, () => {
    it('adds limit to the pubkey', async () => {
        const sqlite = await prepareSql();

        const result = addLimitToPubkey({ sqlite, publicKey: 'pubkey_ABCDEFGH', size: 50 });
        assert(result.ok);

        expect(result.value.totalStorageSize).toBe(50);
        expect(result.value.unspendStorageSize).toBe(50);
    });

    it('adds to existing limit for same pubkey', async () => {
        const sqlite = await prepareSql();

        addLimitToPubkey({ sqlite, publicKey: 'pubkey_ABCDEFGH', size: 50 });

        const result = addLimitToPubkey({ sqlite, publicKey: 'pubkey_ABCDEFGH', size: 30 });
        assert(result.ok);

        expect(result.value.totalStorageSize).toBe(80);
        expect(result.value.unspendStorageSize).toBe(80);
    });

    it('handles zero size addition', async () => {
        const sqlite = await prepareSql();

        const result = addLimitToPubkey({ sqlite, publicKey: 'pubkey_ABCDEFGH', size: 0 });
        assert(result.ok);

        expect(result.value.totalStorageSize).toBe(0);
        expect(result.value.unspendStorageSize).toBe(0);
    });

    it('handles different pubkeys independently', async () => {
        const sqlite = await prepareSql();
        addLimitToPubkey({ sqlite, publicKey: 'pubkey_AAAA', size: 100 });

        const result = addLimitToPubkey({ sqlite, publicKey: 'pubkey_BBBB', size: 200 });
        assert(result.ok);

        expect(result.value.totalStorageSize).toBe(200);
        expect(result.value.unspendStorageSize).toBe(200);
    });
});
