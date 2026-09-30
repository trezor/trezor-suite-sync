import 'dotenv/config';

import { Port } from '@evolu/common';
import { installPolyfills } from '@evolu/common/polyfills';
import { runMain } from '@evolu/nodejs';
import { mkdirSync } from 'fs';
import { join } from 'path';

import { config } from '../config.js';
import { createEvoluRelayCompositionRoot } from './createEvoluRelayCompositionRoot.js';
import { createEvoluRelayRunDeps } from './createEvoluRelayRunDeps.js';

installPolyfills();

await runMain(createEvoluRelayRunDeps())(async run => {
    // Ensure the database is created in a predictable location for Docker.
    const dataPath = join(process.cwd(), config.dataDir);
    mkdirSync(dataPath, { recursive: true });
    process.chdir(dataPath);

    const { evoluRelay, healthServer } = createEvoluRelayCompositionRoot();

    await using _healthServer = await healthServer.start({ port: config.health.port });

    return await run(evoluRelay({ port: Port.orThrow(config.relay.port) }));
});
