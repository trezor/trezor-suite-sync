import { EvoluRelayDep, createEvoluRelay } from './createEvoluRelay.js';
import { HealthServerDep, createHealthServer } from '../health/createHealthServer.js';
import { createLimitStorage } from '../storage/limitStorage/limitStorage.js';
import { createPostgreSql } from '../storage/postgres/createPostgreSql.js';

export const createEvoluRelayCompositionRoot = (): HealthServerDep & EvoluRelayDep => {
    const db = createPostgreSql();
    const { getLimitsForOwner } = createLimitStorage({ db });
    const healthServer = createHealthServer();

    const evoluRelay = createEvoluRelay({
        getLimitsForOwner,
        updateHealth: healthServer.updateHealth,
    });

    return {
        healthServer,
        evoluRelay,
    };
};
