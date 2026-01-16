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
