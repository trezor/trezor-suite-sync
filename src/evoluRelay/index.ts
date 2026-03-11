import 'dotenv/config';

import { mkdirSync } from 'fs';
import { join } from 'path';

import { config } from '../config.js';
import { createEvoluRelayCompositionRoot } from './createEvoluRelayCompositionRoot.js';

const dataPath = join(process.cwd(), config.dataDir);
mkdirSync(dataPath, { recursive: true });
process.chdir(dataPath);

const run = async () => {
    const { migrateToLatest, evoluRelay, healthServer } = createEvoluRelayCompositionRoot();

    await migrateToLatest();
    healthServer.start({ port: config.health.port });
    evoluRelay({ port: config.relay.port });
};

run();
