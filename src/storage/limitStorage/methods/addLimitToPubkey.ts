import { type Result, err, ok } from '@evolu/common';

import { type GetLimitsForPubkeyResponse, getLimitsForPubkey } from './getLimitsForPubkey.js';
import { type ConsistencyError, consistencyError } from '../../../errors.js';
import { DatabaseError, dbQuery } from '../../utils/dbQuery.js';
import { type PublicKey, type Size } from '../limitStorage.js';
import { LimitStorageDatabase } from '../preparePostgreSql.js';

export type AddLimitToPubkeyParams = {
    db: LimitStorageDatabase;
    publicKey: PublicKey;
    size: Size; // size to add to the limit
};

export const addLimitToPubkey = async ({
    db,
    publicKey,
    size,
}: AddLimitToPubkeyParams): Promise<
    Result<GetLimitsForPubkeyResponse, ConsistencyError | DatabaseError>
> => {
    const resultUpsert = await dbQuery(() =>
        db
            .insertInto('pubkey_storage_limits')
            .values({
                publicKey,
                totalStorageSize: size,
                unspendStorageSize: size,
            })
            .onConflict(oc =>
                oc.column('publicKey').doUpdateSet({
                    totalStorageSize: eb => eb('totalStorageSize', '+', size),
                    unspendStorageSize: eb => eb('unspendStorageSize', '+', size),
                }),
            )
            .execute(),
    );

    if (!resultUpsert.ok) {
        return resultUpsert;
    }

    const resultSelect = await getLimitsForPubkey({ db, publicKey });

    if (!resultSelect.ok) {
        return resultSelect;
    }

    if (resultSelect.value === null) {
        return err(
            consistencyError('Reselect of allowance after insert failed. This shall not happen.'),
        );
    }

    return ok(resultSelect.value);
};
