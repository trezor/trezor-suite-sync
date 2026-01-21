/**
 * IMPORTANT: This file is here only for testing / backwards compatibility.
 *            Relay/Quota Manager shall be run separately.
 */

import 'dotenv/config';

import { mkdirSync } from 'fs';
import { join } from 'path';

import { IS_DEV_SERVER } from './env.js';
import { createEvoluRelayCompositionRoot } from './evoluRelay/createEvoluRelayCompositionRoot.js';
import { createQuotaManagerCompositionRoot } from './quotaManager/createQuotaManagerCompositionRoot.js';

const QUOTA_MANAGER_PORT = process.env.QUOTA_MANAGER_PORT
    ? parseInt(process.env.QUOTA_MANAGER_PORT, 10)
    : 4001;

const HEALTH_SERVER_PORT = process.env.HEALTH_PORT ? parseInt(process.env.HEALTH_PORT, 10) : 4002;

const RELAY_PORT = process.env.RELAY_PORT ? parseInt(process.env.RELAY_PORT, 10) : 4000;
const shouldAuthenticate = !IS_DEV_SERVER;

const DATA_DIR = process.env.DATA_DIR || 'data';

const dataPath = join(process.cwd(), DATA_DIR);
mkdirSync(dataPath, { recursive: true });
process.chdir(dataPath);

const runAll = async () => {
    const { migrateToLatest, evoluRelay, healthServer } = createEvoluRelayCompositionRoot();
    const { quotaManagerServer } = createQuotaManagerCompositionRoot();

    await migrateToLatest();

    healthServer.start({ port: HEALTH_SERVER_PORT });
    evoluRelay({ port: RELAY_PORT, shouldAuthenticate });
    quotaManagerServer({ port: QUOTA_MANAGER_PORT });
};

runAll();
