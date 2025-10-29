import { OwnerId } from '@evolu/common';

import type { LimitStorage } from '../../../../storage/limitStorage/limitStorage.js';
import {
    Proof,
    PublicKey,
    Size,
    Timestamp,
} from '../../../../storage/limitStorage/limitStorage.js';
import { Result } from '../../../types.js';

type TransferStorageError = { type: 'SqliteError' } | { type: 'NoStorageAllowance' };

export type TransferOperationDeps = {
    limitStorage: Pick<LimitStorage, 'transferSpaceLimitToOwner'>;
};

export type TransferOperationInput = {
    proof: Proof;
    size: Size;
    timestamp: Timestamp;
    publicKey: PublicKey;
    ownerId: OwnerId;
};

export type TransferOperationOutput = {
    proof: Proof;
    size: Size;
    timestamp: Timestamp;
    publicKey: PublicKey;
};

export const transferStorageOperation = (
    deps: TransferOperationDeps,
    input: TransferOperationInput,
): Result<TransferOperationOutput, TransferStorageError> => {
    const { size, publicKey, timestamp, proof, ownerId } = input;

    const result = deps.limitStorage.transferSpaceLimitToOwner({ publicKey, ownerId, size });

    if (!result.ok) {
        return { ok: false, error: { type: result.error.type } };
    }

    return {
        ok: true,
        value: { proof, size, timestamp, publicKey },
    };
};
