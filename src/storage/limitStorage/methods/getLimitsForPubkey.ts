import { type Result, ok } from '@evolu/common';

import { DatabaseError, dbQuery } from '../../utils/dbQuery.js';
import { PublicKey, Size } from '../limitStorage.js';
import { LimitStorageDatabase } from '../preparePostgreSql.js';

export type GetLimitsForPubkey = {
    db: LimitStorageDatabase;
    publicKey: PublicKey;
};

export type GetLimitsForPubkeyResponse = {
    totalStorageSize: Size;
    unspendStorageSize: Size;
};

export const getLimitsForPubkey = async ({
    db,
    publicKey,
}: GetLimitsForPubkey): Promise<Result<GetLimitsForPubkeyResponse | null, DatabaseError>> => {
    const result = await dbQuery(
        async () =>
            await db
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
