import 'dotenv/config';

import { config } from '../config.js';
import { createQuotaManagerCompositionRoot } from './createQuotaManagerCompositionRoot.js';

const run = async () => {
    const { migrateToLatest, quotaManagerServer, healthServer } =
        createQuotaManagerCompositionRoot();

    await migrateToLatest();
    healthServer.start({ port: config.health.port });
    quotaManagerServer({ port: config.quotaManager.port });
};

run();
