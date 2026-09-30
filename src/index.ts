/**
 * IMPORTANT: This file is here only for testing / backwards compatibility.
 *            Relay/Quota Manager shall be run separately.
 */

import 'dotenv/config';

import { Port } from '@evolu/common';
import { installPolyfills } from '@evolu/common/polyfills';
import { runMain } from '@evolu/nodejs';
import { mkdirSync } from 'fs';
import { join } from 'path';

import { config } from './config.js';
import { createEvoluRelayCompositionRoot } from './evoluRelay/createEvoluRelayCompositionRoot.js';
import { createEvoluRelayRunDeps } from './evoluRelay/createEvoluRelayRunDeps.js';
import { createMetricsCompositionRoot } from './metrics/createMetricsCompositionRoot.js';
import { createQuotaManagerCompositionRoot } from './quotaManager/createQuotaManagerCompositionRoot.js';

installPolyfills();

await runMain(createEvoluRelayRunDeps())(async run => {
    const dataPath = join(process.cwd(), config.dataDir);
    mkdirSync(dataPath, { recursive: true });
    process.chdir(dataPath);

    const { evoluRelay, healthServer } = createEvoluRelayCompositionRoot();
    const { quotaManagerServer, migrateToLatest } = createQuotaManagerCompositionRoot();
    const { metricsServer } = createMetricsCompositionRoot();

    await migrateToLatest();

    await using _healthServer = await healthServer.start({ port: config.health.port });

    // Intentionally not awaited, we want to run all!
    quotaManagerServer({ port: config.quotaManager.port }).catch(error => {
        console.error('Failed to start services:', error);
        process.exitCode = 1;
    });

    metricsServer({ port: config.metrics.port }).catch(error => {
        console.error('Failed to start services:', error);
        process.exitCode = 1;
    });

    return await run(evoluRelay({ port: Port.orThrow(config.relay.port) }));
});
