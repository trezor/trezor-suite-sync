import { OwnerId } from '@evolu/common';

import type { LimitStorage } from '../../../../storage/limitStorage/limitStorage.js';
import { PublicKey } from '../../../../storage/limitStorage/limitStorage.js';
import { Result } from '../../../types.js';

type AskStorageError =
    | { type: 'SqliteError' }
    | { type: 'OwnerNotFound' }
    | { type: 'PublicKeyNotFound' };

export type AskOperationDeps = {
    limitStorage: Pick<LimitStorage, 'getLimitForOwner' | 'getLimitForPubkey'>;
};

export type AskByOwnerOutput = {
    totalSpace: number;
};

export type AskByPublicKeyOutput = {
    totalSpace: number;
    unspentSpace: number;
};

export const askStorageByOwnerId = (
    deps: AskOperationDeps,
    ownerId: OwnerId,
): Result<AskByOwnerOutput, AskStorageError> => {
    const result = deps.limitStorage.getLimitForOwner({ ownerId });

    if (!result.ok) {
        return result;
    }

    if (result.value === null) {
        return {
            ok: false,
            error: { type: 'OwnerNotFound' },
        };
    }

    return {
        ok: true,
        value: { totalSpace: result.value },
    };
};

export const askStorageByPublicKey = (
    deps: AskOperationDeps,
    publicKey: PublicKey,
): Result<AskByPublicKeyOutput, AskStorageError> => {
    const result = deps.limitStorage.getLimitForPubkey({ publicKey });

    if (!result.ok) {
        return result;
    }

    if (result.value === null) {
        return {
            ok: false,
            error: { type: 'PublicKeyNotFound' },
        };
    }

    return {
        ok: true,
        value: {
            totalSpace: result.value.totalStorageSize,
            unspentSpace: result.value.unspendStorageSize,
        },
    };
};
