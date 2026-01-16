import 'dotenv/config';

import { createCompositionRoot } from '../createCompositionRoot.js';

const HEALTH_SERVER_PORT = process.env.HEALTH_PORT ? parseInt(process.env.HEALTH_PORT, 10) : 4002;

const QUOTA_MANAGER_PORT = process.env.QUOTA_MANAGER_PORT
    ? parseInt(process.env.QUOTA_MANAGER_PORT, 10)
    : 4001;

const run = async () => {
    const { migrateToLatest, quotaManagerServer, healthServer } = createCompositionRoot();

    await migrateToLatest();
    healthServer.start({ port: HEALTH_SERVER_PORT });
    quotaManagerServer({ port: QUOTA_MANAGER_PORT });
};

run();
