import { createConsole, createSqlite, getOrThrow, SimpleName } from '@evolu/common';
import { createBetterSqliteDriver } from '@evolu/nodejs';
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

export const createLimitStorage = async () => {
    const deps = {
        console: createConsole(),
    };

    // For now, using the SQLite implementation from Evolu to simply store the limits in plain SQL
    const name = getOrThrow(SimpleName.from('gate-payment-server'));
    const sqlite = getOrThrow(
        await createSqlite({
            ...deps,
            createSqliteDriver: createBetterSqliteDriver,
        })(name),
    );

    const result1 = sqlite.exec(createPubkeyLimitTableQueryIfNotExists);
    if (!result1.ok) {
        console.error(result1.error.error);
        return null;
    }

    const result2 = sqlite.exec(createOwnerLimitTableQueryIfNotExists);
    if (!result2.ok) {
        console.error(result2.error.error);
        return null;
    }

    return {
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
    };
};

export type LimitStorage = Awaited<ReturnType<typeof createLimitStorage>>;
