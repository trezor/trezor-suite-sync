import { Result, err, ok } from '@evolu/common';

import { GetDevicesCountDep } from './createGetDevicesCount.js';
import { GetDevicesUsedTotalDep } from './createGetDevicesUsedTotal.js';
import {
    DevicesUsedTotalBreakdown,
    GetDevicesUsedTotalBreakdownDep,
} from './createGetDevicesUsedTotalBreakdown.js';
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
    devicesUsedTotal: number;
    devicesUsedTotalBreakdown: DevicesUsedTotalBreakdown;
    ownersAllocatedTotalBreakdown: OwnersAllocatedTotalBreakdown;
};

export type GetRelayUsageMetrics = () => Promise<Result<RelayUsageMetrics, DatabaseError>>;

export type GetRelayUsageMetricsDep = { getRelayUsageMetrics: GetRelayUsageMetrics };

export type GetRelayUsageMetricsDeps = GetOwnersCountDep &
    GetDevicesCountDep &
    GetOwnersAllocatedTotalDep &
    GetDevicesUsedTotalDep &
    GetDevicesUsedTotalBreakdownDep &
    GetOwnersAllocatedTotalBreakdownDep;

export const createGetRelayUsageMetrics =
    (deps: GetRelayUsageMetricsDeps): GetRelayUsageMetrics =>
    async () => {
        const [
            ownersCount,
            devicesCount,
            ownersAllocatedTotal,
            devicesUsedTotal,
            devicesUsedTotalBreakdown,
            ownersAllocatedTotalBreakdown,
        ] = await Promise.all([
            deps.getOwnersCount(),
            deps.getDevicesCount(),
            deps.getOwnersAllocatedTotal(),
            deps.getDevicesUsedTotal(),
            deps.getDevicesUsedTotalBreakdown(),
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

        if (!devicesUsedTotal.ok) {
            return err(devicesUsedTotal.error);
        }

        if (!devicesUsedTotalBreakdown.ok) {
            return err(devicesUsedTotalBreakdown.error);
        }

        if (!ownersAllocatedTotalBreakdown.ok) {
            return err(ownersAllocatedTotalBreakdown.error);
        }

        return ok({
            ownersCount: ownersCount.value,
            devicesCount: devicesCount.value,
            ownersAllocatedTotal: ownersAllocatedTotal.value,
            devicesUsedTotal: devicesUsedTotal.value,
            devicesUsedTotalBreakdown: devicesUsedTotalBreakdown.value,
            ownersAllocatedTotalBreakdown: ownersAllocatedTotalBreakdown.value,
        });
    };
