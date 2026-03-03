import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

import type { Database } from './database.js';
import { prepareDatabase } from './prepareDatabase.js';
import { config } from '../../config.js';

export type AppDatabase = Kysely<Database>;

export type AppDatabaseDep = { db: AppDatabase };

export const createPostgreSql = (): AppDatabase => {
    const dialect = new PostgresDialect({
        pool: new Pool({
            host: config.postgres.host,
            port: config.postgres.port,
            user: config.postgres.user,
            password: config.postgres.password,
            database: config.postgres.db,
            ssl: config.postgres.ssl ? { rejectUnauthorized: false } : undefined,
        }),
    });

    return prepareDatabase({ dialect });
};
