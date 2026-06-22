/**
 * IMPORTANT: This file is here only for testing / backwards compatibility.
 *            Relay/Quota Manager shall be run separately.
 */

import 'dotenv/config';

import { mkdirSync } from 'fs';
import { join } from 'path';

import { config } from './config.js';
import { createEvoluRelayCompositionRoot } from './evoluRelay/createEvoluRelayCompositionRoot.js';
import { createMetricsCompositionRoot } from './metrics/createMetricsCompositionRoot.js';
import { createQuotaManagerCompositionRoot } from './quotaManager/createQuotaManagerCompositionRoot.js';

const dataPath = join(process.cwd(), config.dataDir);
mkdirSync(dataPath, { recursive: true });
process.chdir(dataPath);

const runAll = async () => {
    const { evoluRelay, healthServer } = createEvoluRelayCompositionRoot();
    const { quotaManagerServer, migrateToLatest } = createQuotaManagerCompositionRoot();
    const { metricsServer } = createMetricsCompositionRoot();

    await migrateToLatest();

    healthServer.start({ port: config.health.port });

    // Intentionally not awaited, we want to run both!
    quotaManagerServer({ port: config.quotaManager.port }).catch(error => {
        console.error('Failed to start services:', error);
        process.exitCode = 1;
    });

    evoluRelay({ port: config.relay.port }).catch(error => {
        console.error('Failed to start services:', error);
        process.exitCode = 1;
    });

    metricsServer({ port: config.metrics.port }).catch(error => {
        console.error('Failed to start services:', error);
        process.exitCode = 1;
    });
};

// Intentionally not awaited, we want to run all!
runAll();
