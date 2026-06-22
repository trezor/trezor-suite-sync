import { Result, err, ok } from '@evolu/common';

import { GetDevicesAllocatedTotalDep } from './createGetDevicesAllocatedTotal.js';
import { GetDevicesCountDep } from './createGetDevicesCount.js';
import { GetDevicesUnspendTotalDep } from './createGetDevicesUnspendTotal.js';
import { GetOwnersAllocatedTotalDep } from './createGetOwnersAllocatedTotal.js';
import {
    GetOwnersAllocatedTotalBreakdownDep,
    OwnersAllocatedTotalBreakdown,
} from './createGetOwnersAllocatedTotalBreakdown.js';
import { GetOwnersCountDep } from './createGetOwnersCount.js';
import { DatabaseError } from '../utils/dbQuery.js';

export type RelayUsageMetrics = {
    ownersCount: number;
    devicesCount: number;
    ownersAllocatedTotal: number;
    devicesAllocatedTotal: number;
    devicesUnspendTotal: number;
    ownersAllocatedTotalBreakdown: OwnersAllocatedTotalBreakdown;
};

export type GetRelayUsageMetrics = () => Promise<Result<RelayUsageMetrics, DatabaseError>>;

export type GetRelayUsageMetricsDep = { getRelayUsageMetrics: GetRelayUsageMetrics };

export type GetRelayUsageMetricsDeps = GetOwnersCountDep &
    GetDevicesCountDep &
    GetOwnersAllocatedTotalDep &
    GetDevicesAllocatedTotalDep &
    GetDevicesUnspendTotalDep &
    GetOwnersAllocatedTotalBreakdownDep;

export const createGetRelayUsageMetrics =
    (deps: GetRelayUsageMetricsDeps): GetRelayUsageMetrics =>
    async () => {
        const [
            ownersCount,
            devicesCount,
            ownersAllocatedTotal,
            devicesAllocatedTotal,
            devicesUnspendTotal,
            ownersAllocatedTotalBreakdown,
        ] = await Promise.all([
            deps.getOwnersCount(),
            deps.getDevicesCount(),
            deps.getOwnersAllocatedTotal(),
            deps.getDevicesAllocatedTotal(),
            deps.getDevicesUnspendTotal(),
            deps.getOwnersAllocatedTotalBreakdown(),
        ]);

        if (!ownersCount.ok) {
            return err(ownersCount.error);
        }

        if (!devicesCount.ok) {
            return err(devicesCount.error);
        }

        if (!ownersAllocatedTotal.ok) {
            return err(ownersAllocatedTotal.error);
        }

        if (!devicesAllocatedTotal.ok) {
            return err(devicesAllocatedTotal.error);
        }

        if (!devicesUnspendTotal.ok) {
            return err(devicesUnspendTotal.error);
        }

        if (!ownersAllocatedTotalBreakdown.ok) {
            return err(ownersAllocatedTotalBreakdown.error);
        }

        return ok({
            ownersCount: ownersCount.value,
            devicesCount: devicesCount.value,
            ownersAllocatedTotal: ownersAllocatedTotal.value,
            devicesAllocatedTotal: devicesAllocatedTotal.value,
            devicesUnspendTotal: devicesUnspendTotal.value,
            ownersAllocatedTotalBreakdown: ownersAllocatedTotalBreakdown.value,
        });
    };
