import { Result, err, ok } from '@evolu/common';
import { Gauge, Registry } from 'prom-client';

import { OWNERS_ALLOCATED_TOTAL_BREAKDOWN_BUCKETS } from '../storage/metrics/createGetOwnersAllocatedTotalBreakdown.js';
import { GetRelayUsageMetricsDep } from '../storage/metrics/createGetRelayUsageMetrics.js';
import { DatabaseError } from '../storage/utils/dbQuery.js';

export type MetricsOperationDeps = GetRelayUsageMetricsDep;

export type MetricsOperationResult = {
    body: string;
    contentType: string;
};

export type MetricsOperation = () => Promise<Result<MetricsOperationResult, DatabaseError>>;

export type MetricsOperationDep = {
    metricsOperation: MetricsOperation;
};

export const createMetricsOperation = (deps: MetricsOperationDeps): MetricsOperation => {
    const registry = new Registry();

    const ownersCount = new Gauge({
        name: 'trezor_suite_sync_owners_count',
        help: 'Number of owners with allocated Suite Sync quota.',
        registers: [registry],
    });

    const devicesCount = new Gauge({
        name: 'trezor_suite_sync_devices_count',
        help: 'Number of registered device public keys.',
        registers: [registry],
    });

    const ownersAllocatedTotal = new Gauge({
        name: 'trezor_suite_sync_owners_allocated_total',
        help: 'Total quota bytes allocated to owners, not actual relay storage usage.',
        registers: [registry],
    });

    const devicesAllocatedTotal = new Gauge({
        name: 'trezor_suite_sync_devices_allocated_total',
        help: 'Total quota bytes registered by devices.',
        registers: [registry],
    });

    const devicesUnspendTotal = new Gauge({
        name: 'trezor_suite_sync_devices_unspend_total',
        help: 'Registered device quota bytes not assigned to owners or burned.',
        registers: [registry],
    });

    const ownersAllocatedTotalBreakdown = new Gauge({
        name: 'trezor_suite_sync_owners_allocated_total_breakdown',
        help: 'Bucketed distribution of owner allocated quota bytes.',
        labelNames: ['bucket'],
        registers: [registry],
    });

    return async () => {
        const metricsResult = await deps.getRelayUsageMetrics();

        if (!metricsResult.ok) {
            return err(metricsResult.error);
        }

        ownersCount.set(metricsResult.value.ownersCount);
        devicesCount.set(metricsResult.value.devicesCount);
        ownersAllocatedTotal.set(metricsResult.value.ownersAllocatedTotal);
        devicesAllocatedTotal.set(metricsResult.value.devicesAllocatedTotal);
        devicesUnspendTotal.set(metricsResult.value.devicesUnspendTotal);

        for (const bucket of OWNERS_ALLOCATED_TOTAL_BREAKDOWN_BUCKETS) {
            ownersAllocatedTotalBreakdown.set(
                { bucket: bucket.label },
                metricsResult.value.ownersAllocatedTotalBreakdown[bucket.label],
            );
        }

        return ok({
            body: await registry.metrics(),
            contentType: registry.contentType,
        });
    };
};
