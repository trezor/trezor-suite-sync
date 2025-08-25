import { createConsole, createSqlite, getOrThrow, SimpleName } from '@evolu/common';
import { createBetterSqliteDriver } from '@evolu/nodejs';

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
};
