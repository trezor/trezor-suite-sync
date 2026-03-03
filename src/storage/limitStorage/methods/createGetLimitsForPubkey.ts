import { type Result, ok } from '@evolu/common';
import { Transaction } from 'kysely';

import { AppDatabaseDep } from '../../postgres/createPostgreSql.js';
import { Database } from '../../postgres/database.js';
import { DatabaseError, dbQuery } from '../../utils/dbQuery.js';
import { PublicKey, Size } from '../limitStorage.js';

export type GetLimitsForPubkeyDeps = AppDatabaseDep;

export type GetLimitsForPubkeyParams = {
    publicKey: PublicKey;
    trx?: Transaction<Database>;
};

export type GetLimitsForPubkeyResponse = {
    totalStorageSize: Size;
    unspentStorageSize: Size;
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
                    .select(['totalStorageSize', 'unspentStorageSize'])
                    .executeTakeFirst(),
        );

        if (!result.ok) {
            return result;
        }

        const row = result.value;

        return ok(row ?? null);
    };
