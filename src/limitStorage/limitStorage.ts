import {
    createConsole,
    createSqlite,
    getOrThrow,
    ok,
    SimpleName,
    type Sqlite,
} from '@evolu/common';
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

const prepareSqlite = async () => {
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

    //
    const result1 = sqlite.exec(createPubkeyLimitTableQueryIfNotExists);

    if (!result1.ok) {
        return result1;
    }

    const result2 = sqlite.exec(createOwnerLimitTableQueryIfNotExists);

    if (!result2.ok) {
        return result2;
    }

    return ok(sqlite);
};

const createStorage = (sqlite: Sqlite) => ({
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

export type LimitStorage = Awaited<ReturnType<typeof createStorage>>;

export const createLimitStorage = async () => {
    const sqlite = await prepareSqlite();

    return sqlite.ok ? ok(createStorage(sqlite.value)) : sqlite;
};
