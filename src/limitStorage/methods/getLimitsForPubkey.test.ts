import { describe, expect, it } from 'vitest';
import { getLimitsForPubkey } from './getLimitsForPubkey.js';
import { getOrThrow } from '@evolu/common';
import { prepareSqlite } from '../limitStorage.js';
import { addLimitToPubkey } from './addLimitToPubkey.js';

describe(getLimitsForPubkey.name, () => {
    it('returns null when publicKey does not exist', async () => {
        const sqlite = getOrThrow(await prepareSqlite({ inMemory: true }));
        const result = getOrThrow(getLimitsForPubkey({ sqlite, publicKey: 'nonexistent' }));
        expect(result).toBe(null);
    });

    it('returns limits for existing publicKey', async () => {
        const sqlite = getOrThrow(await prepareSqlite({ inMemory: true }));
        addLimitToPubkey({ sqlite, publicKey: 'pubkey_ABCDEFGH', size: 100 });

        const result = getOrThrow(getLimitsForPubkey({ sqlite, publicKey: 'pubkey_ABCDEFGH' }));
        expect(result).toEqual({
            totalStorageSize: 100,
            unspendStorageSize: 100,
        });
    });

    it('returns updated limits after multiple adds', async () => {
        const sqlite = getOrThrow(await prepareSqlite({ inMemory: true }));
        addLimitToPubkey({ sqlite, publicKey: 'pubkey_ABCDEFGH', size: 50 });
        addLimitToPubkey({ sqlite, publicKey: 'pubkey_ABCDEFGH', size: 30 });

        const result = getOrThrow(getLimitsForPubkey({ sqlite, publicKey: 'pubkey_ABCDEFGH' }));
        expect(result).toEqual({
            totalStorageSize: 80,
            unspendStorageSize: 80,
        });
    });
});
