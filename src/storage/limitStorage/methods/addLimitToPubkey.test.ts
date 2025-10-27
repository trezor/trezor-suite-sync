import { describe, expect, test } from 'vitest';
import { addLimitToPubkey } from './addLimitToPubkey.js';
import { getOrThrow } from '@evolu/common';
import { prepareSqlite } from '../../prepareSqlite.js';

describe(addLimitToPubkey.name, () => {
    test('adds limit to the owner', async () => {
        const sqlite = getOrThrow(await prepareSqlite({ inMemory: true }));
        const result = getOrThrow(
            addLimitToPubkey({ sqlite, publicKey: 'pubkey_ABCDEFGH', size: 50 }),
        );
        expect(result.totalStorageSize).toBe(50);
        expect(result.unspendStorageSize).toBe(50);
    });
});
