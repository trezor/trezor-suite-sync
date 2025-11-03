import type { LimitStorage } from '../../../../storage/limitStorage/limitStorage.js';
import { PublicKey, Size } from '../../../../storage/limitStorage/limitStorage.js';
import { Result } from '../../../types.js';

type RegisterStorageError = { type: 'SqliteError' } | { type: 'ConsistencyError' };

export type RegisterOperationDeps = {
    limitStorage: Pick<LimitStorage, 'addLimitToPubkey'>;
};

export type RegisterOperationInput = {
    publicKey: PublicKey;
    size: Size;
};

export type RegisterOperationOutput = {
    totalStorageSize: number;
    unspendStorageSize: number;
};

export const registerStorageOperation = (
    deps: RegisterOperationDeps,
    input: RegisterOperationInput,
): Result<RegisterOperationOutput, RegisterStorageError> => {
    const { publicKey, size } = input;

    const result = deps.limitStorage.addLimitToPubkey({ publicKey, size });

    if (!result.ok) {
        return { ok: false, error: { type: result.error.type } };
    }

    return {
        ok: true,
        value: {
            totalStorageSize: result.value.totalStorageSize,
            unspendStorageSize: result.value.unspendStorageSize,
        },
    };
};
