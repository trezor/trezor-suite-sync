import { describe, expect, it } from 'vitest';
import { addLimitToPubkey } from './addLimitToPubkey.js';
import { getOrThrow } from '@evolu/common';
import { prepareSqlite } from '../limitStorage.js';

describe(addLimitToPubkey.name, () => {
    it('adds limit to the pubkey', async () => {
        const sqlite = getOrThrow(await prepareSqlite({ inMemory: true }));
        const result = getOrThrow(
            addLimitToPubkey({ sqlite, publicKey: 'pubkey_ABCDEFGH', size: 50 }),
        );
        expect(result.totalStorageSize).toBe(50);
        expect(result.unspendStorageSize).toBe(50);
    });

    it('adds to existing limit for same pubkey', async () => {
        const sqlite = getOrThrow(await prepareSqlite({ inMemory: true }));

        addLimitToPubkey({ sqlite, publicKey: 'pubkey_ABCDEFGH', size: 50 });

        const result = getOrThrow(
            addLimitToPubkey({ sqlite, publicKey: 'pubkey_ABCDEFGH', size: 30 }),
        );

        expect(result.totalStorageSize).toBe(80);
        expect(result.unspendStorageSize).toBe(80);
    });

    it('handles zero size addition', async () => {
        const sqlite = getOrThrow(await prepareSqlite({ inMemory: true }));

        const result = getOrThrow(
            addLimitToPubkey({ sqlite, publicKey: 'pubkey_ABCDEFGH', size: 0 }),
        );

        expect(result.totalStorageSize).toBe(0);
        expect(result.unspendStorageSize).toBe(0);
    });

    it('handles different pubkeys independently', async () => {
        const sqlite = getOrThrow(await prepareSqlite({ inMemory: true }));
        addLimitToPubkey({ sqlite, publicKey: 'pubkey_AAAA', size: 100 });

        const result = getOrThrow(
            addLimitToPubkey({ sqlite, publicKey: 'pubkey_BBBB', size: 200 }),
        );

        expect(result.totalStorageSize).toBe(200);
        expect(result.unspendStorageSize).toBe(200);
    });
});
