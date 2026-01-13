import 'dotenv/config';
import { mkdirSync } from 'fs';
import { join } from 'path';

import { startEvoluRelay } from './evoluRelay/relay.js';
import { startHealthServer } from './health/startHealthServer.js';
import { createQuotaManagerCompositionRoot } from './quotaManager/createQuotaManagerCompositionRoot.js';

const RELAY_PORT = process.env.RELAY_PORT ? parseInt(process.env.RELAY_PORT, 10) : 4000;
const QUOTA_MANAGER_PORT = process.env.QUOTA_MANAGER_PORT
    ? parseInt(process.env.QUOTA_MANAGER_PORT, 10)
    : 4001;
const HEALTH_SERVER_PORT = process.env.HEALTH_PORT ? parseInt(process.env.HEALTH_PORT, 10) : 4002;

const DATA_DIR = process.env.DATA_DIR || 'data';

const dataPath = join(process.cwd(), DATA_DIR);
mkdirSync(dataPath, { recursive: true });
process.chdir(dataPath);

const updateHealth = startHealthServer({
    port: HEALTH_SERVER_PORT,
});

const run = async () => {
    const { challengeStorage, limitStorage, quotaManagerServer } =
        createQuotaManagerCompositionRoot({ updateHealth });

    await limitStorage.ensureTables();
    await challengeStorage.ensureTables();

    const evoluStarted = await startEvoluRelay({
        port: RELAY_PORT,
        limitStorage,
        onHealthChange: updateHealth,
    });

    const quotaManagerStarted = await quotaManagerServer({ port: QUOTA_MANAGER_PORT });

    if (!evoluStarted && !quotaManagerStarted) {
        // eslint-disable-next-line no-console
        console.log('Evolu Relay and Quota Manager started failed, exiting...');
        process.exit(1);
    }
};

run();
