import { type Result, type Sqlite, type SqliteError, err, ok, sql } from '@evolu/common';

import { type ConsistencyError, consistencyError } from '../../../errors.js';
import { PUBKEY_STORAGE_LIMITS_TABLE_NAME } from '../tables.js';
import { type GetLimitsForPubkeyResponse, getLimitsForPubkey } from './getLimitsForPubkey.js';

export type AddLimitToPubkeyParams = {
    sqlite: Sqlite;
    publicKey: string;
    size: number; // size to add to the limit
};

export const addLimitToPubkey = ({
    sqlite,
    publicKey,
    size,
}: AddLimitToPubkeyParams): Result<GetLimitsForPubkeyResponse, ConsistencyError | SqliteError> => {
    const resultUpsert = sqlite.exec<{}>(sql.prepared`
        INSERT INTO ${sql.identifier(PUBKEY_STORAGE_LIMITS_TABLE_NAME)} ("publicKey", "totalStorageSize", "unspendStorageSize")
        VALUES (${publicKey}, ${size}, ${size}) ON CONFLICT("publicKey")
        DO
        UPDATE SET
            "totalStorageSize" = "totalStorageSize" + ${size},
            "unspendStorageSize" = "unspendStorageSize" + ${size};
    `);

    if (!resultUpsert.ok) {
        return resultUpsert;
    }

    const resultSelect = getLimitsForPubkey({ sqlite, publicKey });

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
