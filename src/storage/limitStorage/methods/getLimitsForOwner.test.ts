import { OwnerId, getOrThrow, sql } from '@evolu/common';
import { assert, describe, expect, it } from 'vitest';

import { getLimitsForOwner } from './getLimitsForOwner.js';
import { prepareSqlite } from '../../prepareSqlite.js';
import { createLimitStorage } from '../limitStorage.js';
import { OWNER_STORAGE_LIMITS_TABLE_NAME } from '../tables.js';

const ownerId123 = getOrThrow(OwnerId.from('B4Tjjey5WmWnchjGDF123'));
const ownerId456 = getOrThrow(OwnerId.from('B4Tjjey5WmWnchjGDF456'));

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

        const result = getLimitsForOwner({ sqlite, ownerId: ownerId123 });

        assert(result.ok);
        expect(result.value).toBe(null);
    });

    it('returns storage limit for the right owner', async () => {
        const sqlite = await prepareSql();

        sqlite.exec(sql`
            INSERT INTO ${sql.identifier(OWNER_STORAGE_LIMITS_TABLE_NAME)} (ownerId, storageLimit)
            VALUES (${ownerId123}, 123)
        `);

        sqlite.exec(sql`
            INSERT INTO ${sql.identifier(OWNER_STORAGE_LIMITS_TABLE_NAME)} (ownerId, storageLimit)
            VALUES (${ownerId456}, 456)
        `);

        const result123 = getLimitsForOwner({ sqlite, ownerId: ownerId123 });

        assert(result123.ok);
        expect(result123.value).toBe(123);

        const result456 = getLimitsForOwner({ sqlite, ownerId: ownerId456 });

        assert(result456.ok);
        expect(result456.value).toBe(456);
    });

    it('returns zero storage limit', async () => {
        const sqlite = await prepareSql();
        sqlite.exec(sql`
            INSERT INTO ${sql.identifier(OWNER_STORAGE_LIMITS_TABLE_NAME)} (ownerId, storageLimit)
            VALUES (${ownerId123}, 0)
        `);

        const result = getLimitsForOwner({ sqlite, ownerId: ownerId123 });

        assert(result.ok);
        expect(result.value).toBe(0);
    });
});
