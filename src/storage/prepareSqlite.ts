import { SimpleName, createConsole, createSqlite, getOrThrow } from '@evolu/common';
import { createBetterSqliteDriver } from '@evolu/nodejs';

type PrepareSqliteParams = {
    inMemory?: boolean;
};

export const prepareSqlite = async (params: PrepareSqliteParams = {}) => {
    const { inMemory } = params;

    const deps = {
        console: createConsole(),
    };

    const name = getOrThrow(SimpleName.from('quota-manager-payment-server'));

    return await createSqlite({
        ...deps,
        createSqliteDriver: createBetterSqliteDriver,
    })(name, { memory: inMemory ?? false });
};
