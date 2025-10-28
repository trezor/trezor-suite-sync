import { ok, type Sqlite } from '@evolu/common';
import { addLimitToPubkey, type AddLimitToPubkeyParams } from './methods/addLimitToPubkey.js';
import {
    createOwnerLimitTableQueryIfNotExists,
    createPubkeyLimitTableQueryIfNotExists,
} from './tables.js';
import { type GetLimitsForPubkey, getLimitsForPubkey } from './methods/getLimitsForPubkey.js';
import { getLimitsForOwner, type GetLimitsForOwnerParams } from './methods/getLimitsForOwner.js';
import {
    transferSpaceLimitToOwner,
    type TransferSpaceLimitToOwnerParams,
} from './methods/transferSpaceLimitToOwner.js';
import { UnwrapOk } from '../../types.js';

type CreateLimitStorageDependencies = {
    sqlite: Sqlite;
};

export const createLimitStorage = ({ sqlite }: CreateLimitStorageDependencies) => {
    const result1 = sqlite.exec(createPubkeyLimitTableQueryIfNotExists);

    if (!result1.ok) {
        return result1;
    }

    const result2 = sqlite.exec(createOwnerLimitTableQueryIfNotExists);

    if (!result2.ok) {
        return result2;
    }

    return ok({
        addLimitToPubkey: ({ publicKey, size }: Omit<AddLimitToPubkeyParams, 'sqlite'>) =>
            addLimitToPubkey({ sqlite, publicKey, size }),
        getLimitForPubkey: ({ publicKey }: Omit<GetLimitsForPubkey, 'sqlite'>) =>
            getLimitsForPubkey({ sqlite, publicKey }),
        getLimitForOwner: ({ ownerId }: Omit<GetLimitsForOwnerParams, 'sqlite'>) =>
            getLimitsForOwner({ sqlite, ownerId }),
        transferSpaceLimitToOwner: ({
            ownerId,
            publicKey,
            size,
        }: Omit<TransferSpaceLimitToOwnerParams, 'sqlite'>) =>
            transferSpaceLimitToOwner({ sqlite, ownerId, publicKey, size }),
    });
};

export type LimitStorage = UnwrapOk<ReturnType<typeof createLimitStorage>>;
