import { createConsole } from '@evolu/common';
import type { Dialect } from 'kysely';
import { Kysely } from 'kysely';

import { Database } from './database.js';

type PrepareDatabaseParams = {
    dialect: Dialect;
};

export const prepareDatabase = ({ dialect }: PrepareDatabaseParams) => {
    const console = createConsole();

    return new Kysely<Database>({
        dialect,
        log(event) {
            if (event.level === 'query') {
                console.debug('Database:', event.query.sql);
            } else if (event.level === 'error') {
                console.error('Database:', event.error);
            }
        },
    });
};
