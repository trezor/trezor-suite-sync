import fastify from 'fastify';

import { createMetricsOperation } from './createMetricsOperation.js';
import { MetricsServerDep, createMetricsServer } from './createMetricsServer.js';
import { createMetricsHandler } from './endpoints/createMetricsHandler.js';
import { createGetDevicesCount } from '../storage/metrics/createGetDevicesCount.js';
import { createGetDevicesUsedTotal } from '../storage/metrics/createGetDevicesUsedTotal.js';
import { createGetDevicesUsedTotalBreakdown } from '../storage/metrics/createGetDevicesUsedTotalBreakdown.js';
import { createGetOwnersAllocatedTotal } from '../storage/metrics/createGetOwnersAllocatedTotal.js';
import { createGetOwnersAllocatedTotalBreakdown } from '../storage/metrics/createGetOwnersAllocatedTotalBreakdown.js';
import { createGetOwnersCount } from '../storage/metrics/createGetOwnersCount.js';
import { createGetRelayUsageMetrics } from '../storage/metrics/createGetRelayUsageMetrics.js';
import { createPostgreSql } from '../storage/postgres/createPostgreSql.js';

export const createMetricsCompositionRoot = (): MetricsServerDep => {
    const db = createPostgreSql();

    const getRelayUsageMetrics = createGetRelayUsageMetrics({
        getOwnersCount: createGetOwnersCount({ db }),
        getDevicesCount: createGetDevicesCount({ db }),
        getOwnersAllocatedTotal: createGetOwnersAllocatedTotal({
            db,
        }),
        getDevicesUsedTotal: createGetDevicesUsedTotal({
            db,
        }),
        getDevicesUsedTotalBreakdown: createGetDevicesUsedTotalBreakdown({
            db,
        }),
        getOwnersAllocatedTotalBreakdown: createGetOwnersAllocatedTotalBreakdown({ db }),
    });

    const metricsOperation = createMetricsOperation({ getRelayUsageMetrics });
    const metricsHandler = createMetricsHandler({ metricsOperation });

    const metricsFastifyServer = fastify();
    metricsFastifyServer.get('/metrics', metricsHandler);

    const metricsServer = createMetricsServer({ metricsFastifyServer });

    return { metricsServer };
};
