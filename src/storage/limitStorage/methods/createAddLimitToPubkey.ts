import { type Result, err, ok } from '@evolu/common';

import {
    GetLimitsForPubkeyDep,
    type GetLimitsForPubkeyResponse,
} from './createGetLimitsForPubkey.js';
import { type ConsistencyError, consistencyError } from '../../../errors.js';
import { AppDatabaseDep } from '../../postgres/createPostgreSql.js';
import { DatabaseError, dbQuery } from '../../utils/dbQuery.js';
import { type PublicKey, type Size } from '../limitStorage.js';

export type AddLimitToPubkeyDeps = AppDatabaseDep & GetLimitsForPubkeyDep;

export type AddLimitToPubkeyParams = {
    publicKey: PublicKey;
    size: Size; // size to add to the limit
};

export type AddLimitToPubkey = (
    params: AddLimitToPubkeyParams,
) => Promise<Result<GetLimitsForPubkeyResponse, ConsistencyError | DatabaseError>>;

export type AddLimitToPubkeyDep = { addLimitToPubkey: AddLimitToPubkey };

export const createAddLimitToPubkey =
    (deps: AddLimitToPubkeyDeps): AddLimitToPubkey =>
    async ({ publicKey, size }: AddLimitToPubkeyParams) => {
        const resultUpsert = await dbQuery(() =>
            deps.db
                .insertInto('pubkey_storage_limits')
                .values({
                    publicKey,
                    totalStorageSize: size,
                    unspentStorageSize: size,
                })
                .onConflict(oc =>
                    oc.column('publicKey').doUpdateSet({
                        totalStorageSize: eb =>
                            eb('pubkey_storage_limits.totalStorageSize', '+', size),
                        unspentStorageSize: eb =>
                            eb('pubkey_storage_limits.unspentStorageSize', '+', size),
                    }),
                )
                .execute(),
        );

        if (!resultUpsert.ok) {
            return resultUpsert;
        }

        const resultSelect = await deps.getLimitsForPubkey({ publicKey });

        if (!resultSelect.ok) {
            return resultSelect;
        }

        if (resultSelect.value === null) {
            return err(
                consistencyError(
                    'Reselect of allowance after insert failed. This shall not happen.',
                ),
            );
        }

        return ok(resultSelect.value);
    };
