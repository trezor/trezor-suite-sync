import { OwnerId, Result, ok } from '@evolu/common';
import { Transaction } from 'kysely';

import { AppDatabase } from '../../posgres/createPostgreSql.js';
import { Database } from '../../posgres/database.js';
import { OWNER_STORAGE_LIMITS_TABLE_NAME } from '../../posgres/tables.js';
import { DatabaseError, dbQuery } from '../../utils/dbQuery.js';

export type GetLimitsForOwnerDeps = {
    db: AppDatabase;
};

export type GetLimitsForOwnerParams = {
    trx?: Transaction<Database>;
    ownerId: OwnerId;
};

export type GetLimitsForOwner = (
    params: GetLimitsForOwnerParams,
) => Promise<Result<number | null, DatabaseError>>;

export type GetLimitsForOwnerDep = { getLimitsForOwner: GetLimitsForOwner };

export const createGetLimitsForOwner =
    ({ db }: GetLimitsForOwnerDeps): GetLimitsForOwner =>
    async ({ ownerId, trx }) => {
        const result = await dbQuery(() =>
            (trx ?? db)
                .selectFrom(OWNER_STORAGE_LIMITS_TABLE_NAME)
                .where('ownerId', '=', ownerId)
                .select(['storageLimit'])
                .limit(1)
                .executeTakeFirst(),
        );

        if (!result.ok) {
            return result;
        }

        const row = result.value;

        return ok(row?.storageLimit ?? null);
    };
