import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

import type { Database } from './database.js';
import { prepareDatabase } from './prepareDatabase.js';

const PG_USER = process.env.POSTGRES_GATE_USER || 'suite-sync';
const PG_HOST = process.env.POSTGRES_GATE_HOST || 'localhost';
const PG_PORT = process.env.POSTGRES_GATE_PORT
    ? parseInt(process.env.POSTGRES_GATE_PORT, 10)
    : 5432;
const PG_DB_NAME = process.env.POSTGRES_GATE_DB || 'suite-sync-quota-manager';
const PG_PASSWORD = process.env.POSTGRES_GATE_PASSWORD || 'password';

export type LimitStorageDatabase = Kysely<Database>;

export const preparePostgreSql = () => {
    const dialect = new PostgresDialect({
        pool: new Pool({
            host: PG_HOST,
            port: PG_PORT,
            user: PG_USER,
            password: PG_PASSWORD,
            database: PG_DB_NAME,
        }),
    });

    return prepareDatabase({ dialect });
};
