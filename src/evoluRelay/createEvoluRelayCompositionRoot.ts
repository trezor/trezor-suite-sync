import { EvoluRelayDep, createEvoluRelay } from './createEvoluRelay.js';
import { HealthServerDep, createHealthServer } from '../health/createHealthServer.js';
import { createLimitStorage } from '../storage/limitStorage/limitStorage.js';
import {
    MigrateToLatestDep,
    createMigrateToLatest,
} from '../storage/postgres/createMigrateToLatest.js';
import { createPostgreSql } from '../storage/postgres/createPostgreSql.js';

export const createEvoluRelayCompositionRoot = (): HealthServerDep &
    EvoluRelayDep &
    MigrateToLatestDep => {
    const db = createPostgreSql();
    const migrateToLatest = createMigrateToLatest({ db });
    const { getLimitsForOwner } = createLimitStorage({ db });
    const healthServer = createHealthServer();

    const evoluRelay = createEvoluRelay({
        getLimitsForOwner,
        updateHealth: healthServer.updateHealth,
    });

    return {
        healthServer,
        evoluRelay,
        migrateToLatest,
    };
};
