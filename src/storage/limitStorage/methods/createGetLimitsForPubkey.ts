import { type Result, ok } from '@evolu/common';
import { Transaction } from 'kysely';

import { DatabaseError, dbQuery } from '../../utils/dbQuery.js';
import { AppDatabaseDep } from '../createPostgreSql.js';
import { Database } from '../database.js';
import { PublicKey, Size } from '../limitStorage.js';

export type GetLimitsForPubkeyDeps = AppDatabaseDep;

export type GetLimitsForPubkeyParams = {
    publicKey: PublicKey;
    trx?: Transaction<Database>;
};

export type GetLimitsForPubkeyResponse = {
    totalStorageSize: Size;
    unspendStorageSize: Size;
};

export type GetLimitsForPubkey = (
    params: GetLimitsForPubkeyParams,
) => Promise<Result<GetLimitsForPubkeyResponse | null, DatabaseError>>;

export type GetLimitsForPubkeyDep = { getLimitsForPubkey: GetLimitsForPubkey };

export const createGetLimitsForPubkey =
    ({ db }: GetLimitsForPubkeyDeps): GetLimitsForPubkey =>
    async ({ publicKey, trx }) => {
        const result = await dbQuery(
            async () =>
                await (trx ?? db)
                    .selectFrom('pubkey_storage_limits')
                    .where('publicKey', '=', publicKey)
                    .select(['totalStorageSize', 'unspendStorageSize'])
                    .executeTakeFirst(),
        );

        if (!result.ok) {
            return result;
        }

        const row = result.value;

        return ok(row ?? null);
    };
