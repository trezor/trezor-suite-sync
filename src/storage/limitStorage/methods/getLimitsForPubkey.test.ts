import { assert, describe, expect, it } from 'vitest';
import { getLimitsForPubkey } from './getLimitsForPubkey.js';
import { addLimitToPubkey } from './addLimitToPubkey.js';
import { prepareSqlite } from '../../prepareSqlite.js';
import { createLimitStorage } from '../limitStorage.js';

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
        const result = getLimitsForPubkey({ sqlite, publicKey: 'nonexistent' });
        assert(result.ok);
        expect(result.value).toBe(null);
    });

    it('returns limits for existing publicKey', async () => {
        const sqlite = await prepareSql();
        addLimitToPubkey({ sqlite, publicKey: 'pubkey_ABCDEFGH', size: 100 });

        const result = getLimitsForPubkey({ sqlite, publicKey: 'pubkey_ABCDEFGH' });
        assert(result.ok);
        expect(result.value).toEqual({
            totalStorageSize: 100,
            unspendStorageSize: 100,
        });
    });

    it('returns updated limits after multiple adds', async () => {
        const sqlite = await prepareSql();
        addLimitToPubkey({ sqlite, publicKey: 'pubkey_ABCDEFGH', size: 50 });
        addLimitToPubkey({ sqlite, publicKey: 'pubkey_ABCDEFGH', size: 30 });

        const result = getLimitsForPubkey({ sqlite, publicKey: 'pubkey_ABCDEFGH' });
        assert(result.ok);
        expect(result.value).toEqual({
            totalStorageSize: 80,
            unspendStorageSize: 80,
        });
    });
});
