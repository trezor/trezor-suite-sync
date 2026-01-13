// eslint-disable-next-line import/no-extraneous-dependencies
import Database from 'better-sqlite3';
import { SqliteDialect } from 'kysely';

import { prepareDatabase } from './prepareDatabase.js';

export const createTestDatabase = () => {
    const driver = Database(':memory:');

    const dialect = new SqliteDialect({
        database: driver,
    });

    return prepareDatabase({ dialect });
};
