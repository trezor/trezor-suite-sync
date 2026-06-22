import 'dotenv/config';

import { config } from '../config.js';
import { createMetricsCompositionRoot } from './createMetricsCompositionRoot.js';

const run = async () => {
    const { metricsServer } = createMetricsCompositionRoot();

    await metricsServer({ port: config.metrics.port });
};

void run().catch(error => {
    console.error('Failed to start Metrics server:', error);
    process.exitCode = 1;
});
