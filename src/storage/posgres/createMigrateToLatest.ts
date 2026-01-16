import { promises as fs } from 'fs';
import { FileMigrationProvider, Migrator } from 'kysely';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { AppDatabaseDep } from './createPostgreSql.js';
import { exhaustive } from '../../exhaustive.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type MigratorDeps = AppDatabaseDep;

export type MigrateToLatest = () => Promise<void>;

export type MigrateToLatestDep = { migrateToLatest: MigrateToLatest };

export const createMigrateToLatest =
    (deps: MigratorDeps): MigrateToLatest =>
    async () => {
        const migrator = new Migrator({
            db: deps.db,
            provider: new FileMigrationProvider({
                fs,
                path,
                migrationFolder: path.join(__dirname, '/migrations'), // This needs to be an absolute path.
            }),
        });

        const { error, results } = await migrator.migrateToLatest();

        for (const it of results ?? []) {
            switch (it.status) {
                case 'Success':
                    // eslint-disable-next-line no-console
                    console.log(`migration "${it.migrationName}" was executed successfully`);

                    return;
                case 'Error':
                    console.error(`failed to execute migration "${it.migrationName}"`);

                    return;
                case 'NotExecuted':
                    // eslint-disable-next-line no-console
                    console.log(`migration "${it.migrationName}" was NOT executed`);

                    return;
                default:
                    return exhaustive(it.status);
            }
        }

        if (error) {
            console.error('failed to migrate');
            console.error(error);
            process.exit(1);
        }
    };
