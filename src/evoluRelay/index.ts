import 'dotenv/config';

import { mkdirSync } from 'fs';
import { join } from 'path';

import { createCompositionRoot } from '../createCompositionRoot.js';
import { IS_DEV_SERVER } from '../env.js';

const HEALTH_SERVER_PORT = process.env.HEALTH_PORT ? parseInt(process.env.HEALTH_PORT, 10) : 4002;

const RELAY_PORT = process.env.RELAY_PORT ? parseInt(process.env.RELAY_PORT, 10) : 4000;
const shouldAuthenticate = !IS_DEV_SERVER;

const DATA_DIR = process.env.DATA_DIR || 'data';

const dataPath = join(process.cwd(), DATA_DIR);
mkdirSync(dataPath, { recursive: true });
process.chdir(dataPath);

const run = async () => {
    const { migrateToLatest, evoluRelay, healthServer } = createCompositionRoot();

    await migrateToLatest();
    healthServer.start({ port: HEALTH_SERVER_PORT });
    evoluRelay({ port: RELAY_PORT, shouldAuthenticate });
};

run();
