// Keep better-sqlite3 on the major @evolu/nodejs depends on (12.x), so tests use the same native
// binding as the relay's storage and only one copy is installed. Upgrade it when Evolu does.
// eslint-disable-next-line import/no-extraneous-dependencies
import Database from 'better-sqlite3';
import { SqliteDialect } from 'kysely';

import { createMigrateToLatest } from './createMigrateToLatest.js';
import { prepareDatabase } from './prepareDatabase.js';

export const createTestDatabase = async () => {
    const driver = Database(':memory:');

    const dialect = new SqliteDialect({
        database: driver,
    });

    const db = prepareDatabase({ dialect });

    const migrateToLatest = createMigrateToLatest({ db });
    await migrateToLatest();

    return db;
};
