import { createConsole, createSqlite, getOrThrow, SimpleName } from '@evolu/common';
import { createBetterSqliteDriver } from '@evolu/nodejs';

type PrepareSqliteParams = {
    inMemory?: boolean;
};

export const prepareSqlite = async (params: PrepareSqliteParams = {}) => {
    const { inMemory } = params;

    const deps = {
        console: createConsole(),
    };

    const name = getOrThrow(SimpleName.from('gate-payment-server'));

    return await createSqlite({
        ...deps,
        createSqliteDriver: createBetterSqliteDriver,
    })(name, { memory: inMemory ?? false });
};
