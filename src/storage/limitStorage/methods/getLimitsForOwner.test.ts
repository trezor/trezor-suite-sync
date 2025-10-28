import { assert, describe, expect, it } from 'vitest';
import { getLimitsForOwner } from './getLimitsForOwner.js';
import { sql } from '@evolu/common';
import { OWNER_STORAGE_LIMITS_TABLE_NAME } from '../tables.js';
import { prepareSqlite } from '../../prepareSqlite.js';
import { createLimitStorage } from '../limitStorage.js';

const prepareSql = async () => {
    const sqlite = await prepareSqlite({ inMemory: true });
    assert(sqlite.ok);

    // Todo: do not create whole LimitStorage just to create table, refactor
    createLimitStorage({ sqlite: sqlite.value });

    return sqlite.value;
};

describe(getLimitsForOwner.name, () => {
    it('returns null when no owner limit exists', async () => {
        const sqlite = await prepareSql();
        const result = getLimitsForOwner({ sqlite, ownerId: 'owner-123' });
        assert(result.ok);
        expect(result.value).toBe(null);
    });

    it('returns storage limit for owner', async () => {
        const sqlite = await prepareSql();

        sqlite.exec(sql`
            INSERT INTO ${sql.identifier(OWNER_STORAGE_LIMITS_TABLE_NAME)} (ownerId, storageLimit)
            VALUES ('owner-123', 500)
        `);

        const result = getLimitsForOwner({ sqlite, ownerId: 'owner-123' });
        assert(result.ok);
        expect(result.value).toBe(500);
    });

    it('returns zero storage limit', async () => {
        const sqlite = await prepareSql();

        sqlite.exec(sql`
            INSERT INTO ${sql.identifier(OWNER_STORAGE_LIMITS_TABLE_NAME)} (ownerId, storageLimit)
            VALUES ('owner-123', 0)
        `);

        const result = getLimitsForOwner({ sqlite, ownerId: 'owner-123' });
        assert(result.ok);
        expect(result.value).toBe(0);
    });
});
