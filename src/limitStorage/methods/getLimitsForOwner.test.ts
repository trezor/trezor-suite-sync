import { describe, expect, it } from 'vitest';
import { getLimitsForOwner } from './getLimitsForOwner.js';
import { getOrThrow, sql } from '@evolu/common';
import { prepareSqlite } from '../limitStorage.js';
import { OWNER_STORAGE_LIMITS_TABLE_NAME } from '../tables.js';

describe(getLimitsForOwner.name, () => {
    it('returns null when no owner limit exists', async () => {
        const sqlite = getOrThrow(await prepareSqlite({ inMemory: true }));
        const result = getOrThrow(getLimitsForOwner({ sqlite, ownerId: 'owner-123' }));
        expect(result).toBe(null);
    });

    it('returns storage limit for owner', async () => {
        const sqlite = getOrThrow(await prepareSqlite({ inMemory: true }));

        sqlite.exec(sql`
            INSERT INTO ${sql.identifier(OWNER_STORAGE_LIMITS_TABLE_NAME)} (ownerId, storageLimit)
            VALUES ('owner-123', 500)
        `);

        const result = getOrThrow(getLimitsForOwner({ sqlite, ownerId: 'owner-123' }));
        expect(result).toBe(500);
    });

    it('returns zero storage limit', async () => {
        const sqlite = getOrThrow(await prepareSqlite({ inMemory: true }));

        sqlite.exec(sql`
            INSERT INTO ${sql.identifier(OWNER_STORAGE_LIMITS_TABLE_NAME)} (ownerId, storageLimit)
            VALUES ('owner-123', 0)
        `);

        const result = getOrThrow(getLimitsForOwner({ sqlite, ownerId: 'owner-123' }));
        expect(result).toBe(0);
    });
});
