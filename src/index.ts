/**
 * IMPORTANT: This file is here only for testing / backwards compatibility.
 *            Relay/Quota Manager shall be run separately.
 */

import 'dotenv/config';

import { mkdirSync } from 'fs';
import { join } from 'path';

import { config } from './config.js';
import { createEvoluRelayCompositionRoot } from './evoluRelay/createEvoluRelayCompositionRoot.js';
import { createQuotaManagerCompositionRoot } from './quotaManager/createQuotaManagerCompositionRoot.js';

const dataPath = join(process.cwd(), config.dataDir);
mkdirSync(dataPath, { recursive: true });
process.chdir(dataPath);

const runAll = async () => {
    const { evoluRelay, healthServer } = createEvoluRelayCompositionRoot();
    const { quotaManagerServer, migrateToLatest } = createQuotaManagerCompositionRoot();

    await migrateToLatest();

    healthServer.start({ port: config.health.port });
    evoluRelay({ port: config.relay.port });
    quotaManagerServer({ port: config.quotaManager.port });
};

runAll();
