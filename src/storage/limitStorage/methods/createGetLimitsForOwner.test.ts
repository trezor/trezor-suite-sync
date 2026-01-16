import { OwnerId } from '@evolu/common';
import { assert, describe, expect, it } from 'vitest';

import { createGetLimitsForOwner } from './createGetLimitsForOwner.js';
import { getOrThrowTest } from '../../../getOrThrowTest.js';
import { createTestDatabase } from '../../posgres/createTestDatabase.js';
import { OWNER_STORAGE_LIMITS_TABLE_NAME } from '../../posgres/tables.js';
import { dbQuery } from '../../utils/dbQuery.js';
import { Size } from '../limitStorage.js';

const ownerId123 = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJg6g'));
const ownerId456 = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJg7g'));

describe(createGetLimitsForOwner.name, () => {
    it('returns null when no owner limit exists', async () => {
        const db = await createTestDatabase();

        const getLimitsForOwner = createGetLimitsForOwner({ db });
        const result = await getLimitsForOwner({ ownerId: ownerId123 });

        assert(result.ok);
        expect(result.value).toBe(null);
    });

    it('returns storage limit for the right owner', async () => {
        const db = await createTestDatabase();

        await dbQuery(() =>
            db
                .insertInto(OWNER_STORAGE_LIMITS_TABLE_NAME)
                .values({
                    ownerId: ownerId123,
                    storageLimit: 123 as Size,
                })
                .execute(),
        );

        await dbQuery(() =>
            db
                .insertInto(OWNER_STORAGE_LIMITS_TABLE_NAME)
                .values({
                    ownerId: ownerId456,
                    storageLimit: 456 as Size,
                })
                .execute(),
        );

        const getLimitsForOwner = createGetLimitsForOwner({ db });
        const result123 = await getLimitsForOwner({ ownerId: ownerId123 });

        assert(result123.ok);
        expect(result123.value).toBe(123);

        const result456 = await getLimitsForOwner({ ownerId: ownerId456 });

        assert(result456.ok);
        expect(result456.value).toBe(456);
    });

    it('returns zero storage limit', async () => {
        const db = await createTestDatabase();

        await dbQuery(() =>
            db

                .insertInto(OWNER_STORAGE_LIMITS_TABLE_NAME)
                .values({
                    ownerId: ownerId123,
                    storageLimit: 0 as Size,
                })
                .execute(),
        );

        const getLimitsForOwner = createGetLimitsForOwner({ db });
        const result = await getLimitsForOwner({ ownerId: ownerId123 });

        assert(result.ok);
        expect(result.value).toBe(0);
    });
});
