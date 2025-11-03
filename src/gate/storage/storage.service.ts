import { OwnerId } from '@evolu/common';

import type { LimitStorage } from '../../storage/limitStorage/limitStorage.js';
import { Proof, PublicKey, Size, Timestamp } from '../../storage/limitStorage/limitStorage.js';
import { Result } from '../types.js';

export type CreateStorageServiceDeps = {
    limitStorage: LimitStorage;
};

export type StorageService = ReturnType<typeof createStorageService>;

type TransferStorageError = { type: 'SqliteError' } | { type: 'NoStorageAllowance' };

type AskStorageError =
    | { type: 'SqliteError' }
    | { type: 'OwnerNotFound' }
    | { type: 'PublicKeyNotFound' };

type RegisterStorageError = { type: 'SqliteError' } | { type: 'ConsistencyError' };

export type StorageServiceError = TransferStorageError | AskStorageError | RegisterStorageError;

export const createStorageService = ({ limitStorage }: CreateStorageServiceDeps) => ({
    transferStorage: (data: {
        proof: Proof;
        size: Size;
        timestamp: Timestamp;
        publicKey: PublicKey;
        ownerId: OwnerId;
    }): Result<
        {
            proof: Proof;
            size: Size;
            timestamp: Timestamp;
            publicKey: PublicKey;
        },
        TransferStorageError
    > => {
        const { size, publicKey, timestamp, proof, ownerId } = data;

        const result = limitStorage.transferSpaceLimitToOwner({ publicKey, ownerId, size });

        if (!result.ok) {
            return { ok: false, error: { type: result.error.type } };
        }

        return {
            ok: true,
            value: { proof, size, timestamp, publicKey },
        };
    },

    askStorageByOwnerId: (ownerId: OwnerId): Result<{ totalSpace: number }, AskStorageError> => {
        const result = limitStorage.getLimitForOwner({ ownerId });

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
    },

    askStorageByPublicKey: (
        publicKey: PublicKey,
    ): Result<{ totalSpace: number; unspentSpace: number }, AskStorageError> => {
        const result = limitStorage.getLimitForPubkey({ publicKey });

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
    },
    registerStorage: (
        publicKey: PublicKey,
        size: Size,
    ): Result<{ unspendStorageSize: number; totalStorageSize: number }, RegisterStorageError> => {
        const result = limitStorage.addLimitToPubkey({ publicKey, size });

        if (!result.ok) {
            return { ok: false, error: { type: result.error.type } };
        }

        return {
            ok: true,
            value: {
                unspendStorageSize: result.value.unspendStorageSize,
                totalStorageSize: result.value.totalStorageSize,
            },
        };
    },

    // TODO implement
    deleteStorage: () => {},
});
