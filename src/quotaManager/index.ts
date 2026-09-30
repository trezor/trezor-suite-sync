import 'dotenv/config';

import { config } from '../config.js';
import { createQuotaManagerCompositionRoot } from './createQuotaManagerCompositionRoot.js';

const run = async () => {
    const { migrateToLatest, quotaManagerServer, healthServer } =
        createQuotaManagerCompositionRoot();

    await migrateToLatest();
    const health = await healthServer.start({ port: config.health.port });
    const closeHealthServer = () => health[Symbol.asyncDispose]();
    process.on('SIGINT', closeHealthServer);
    process.on('SIGTERM', closeHealthServer);
    quotaManagerServer({ port: config.quotaManager.port });
};

run();
