import { OwnerId, type Result, type Sqlite, type SqliteError, err, ok, sql } from '@evolu/common';

import { consistencyError, noSpaceAllowanceErr, type ConsistencyError } from '../../../errors.js';
import {
    OWNER_STORAGE_LIMITS_TABLE_NAME,
    PUBKEY_STORAGE_LIMITS_TABLE_NAME,
} from '../tables.js';
import {
    type GetLimitsForPubkeyResponse,
    getLimitsForPubkey,
} from './getLimitsForPubkey.js';
import { getLimitsForOwner } from './getLimitsForOwner.js';
import { PublicKey, Size } from '../limitStorage.js';

export type AssignSpaceToOwnerParams = {
    sqlite: Sqlite;
    publicKey: PublicKey;
    ownerId: OwnerId;
    size: Size;
};

export type AssignSpaceToOwnerResult = {
    publicKeyLimits: GetLimitsForPubkeyResponse;
    ownerStorageLimit: number | null;
};

const OWNER_ID_BURN = '0' as OwnerId;

type NoSpaceAllowance = ReturnType<typeof noSpaceAllowanceErr>;

export const assignSpaceToOwner = ({
    sqlite,
    publicKey,
    ownerId,
    size,
}: AssignSpaceToOwnerParams): Result<AssignSpaceToOwnerResult, SqliteError | NoSpaceAllowance | ConsistencyError> => {
    const limitsResult = getLimitsForPubkey({ sqlite, publicKey });

    if (!limitsResult.ok) {
        return limitsResult;
    }

    if (limitsResult.value === null) {
        return err(noSpaceAllowanceErr('No space allowance for the given publicKey'));
    }

    if (limitsResult.value.unspendStorageSize < size) {
        return err(noSpaceAllowanceErr('Insufficient unspent space for the given publicKey'));
    }

    const subtractResult = sqlite.exec<{}>(sql.prepared`
        UPDATE ${sql.identifier(PUBKEY_STORAGE_LIMITS_TABLE_NAME)}
        SET "unspendStorageSize" = "unspendStorageSize" - ${size}
        WHERE "publicKey" = ${publicKey};
    `);

    if (!subtractResult.ok) {
        return subtractResult;
    }

    let ownerStorageLimit: number | null = null;

    if (ownerId !== OWNER_ID_BURN) {
        const upsertResult = sqlite.exec<{}>(sql.prepared`
            INSERT INTO ${sql.identifier(OWNER_STORAGE_LIMITS_TABLE_NAME)} ("ownerId", "storageLimit")
            VALUES (${ownerId}, ${size})
            ON CONFLICT("ownerId") DO UPDATE SET
                "storageLimit" = "storageLimit" + ${size};
        `);

        if (!upsertResult.ok) {
            return upsertResult;
        }

        const ownerResult = getLimitsForOwner({ sqlite, ownerId });

        if (!ownerResult.ok) {
            return ownerResult;
        }

        ownerStorageLimit = ownerResult.value;
    }

    const reselectResult = getLimitsForPubkey({ sqlite, publicKey });

    if (!reselectResult.ok) {
        return reselectResult;
    }

    if (reselectResult.value === null) {
        return err(consistencyError('Public key limits disappeared after assignment'));
    }

    return ok({
        publicKeyLimits: reselectResult.value,
        ownerStorageLimit,
    });
};

