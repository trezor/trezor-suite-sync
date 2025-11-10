import { randomBytes } from 'crypto';
import fastify from 'fastify';

import { registerChallengeEndpoints } from './challenge/registerChallengeEndpoints.js';
import { createCustomErrorHandler } from './createCustomErrorHandler.js';
import { evoluValidatorCompiler } from './evoluValidatorCompiler.js';
import { registerStorageEndpoints } from './storage/registerStorageEndpoints.js';
import { registerSyncEndpoints } from './sync/registerSyncEndpoints.js';
import { UpdateHealth } from '../health/startHealthServer.js';
import type { ChallengeStorage } from '../storage/challengeStorage/challengeStorage.js';
import type { LimitStorage } from '../storage/limitStorage/limitStorage.js';

const createRandomBytes = (size: number) => randomBytes(size).toString('hex');

type StartQuotaManagerServerDependencies = {
    port: number;
    limitStorage: LimitStorage;
    challengeStorage: ChallengeStorage;
    onHealthChange: UpdateHealth;
};

export const startQuotaManagerServer = async ({
    port,
    limitStorage,
    challengeStorage,
    onHealthChange,
}: StartQuotaManagerServerDependencies) => {
    const server = fastify();

    try {
        server.setValidatorCompiler(evoluValidatorCompiler);

        server.setErrorHandler(createCustomErrorHandler(onHealthChange));

        registerStorageEndpoints({ server, limitStorage });
        registerSyncEndpoints({ server });
        registerChallengeEndpoints({ server, challengeStorage, createRandomBytes });

        const address = await server.listen({ port, host: '0.0.0.0' });

        onHealthChange({ quotaManager: 'ok' });
        // eslint-disable-next-line no-console
        console.log(`Payment Server (Quota Manager) started on ${address}`);
    } catch (err) {
        console.error('Failed to start Payment Server (Quota Manager):', err);

        onHealthChange({ quotaManager: 'error' });

        return false;
    }

    const close = () => {
        // eslint-disable-next-line no-console
        console.log('Payment Server (Quota Manager) is shutting down...');
        onHealthChange({ quotaManager: 'exiting' });
        server.close();
    };

    process.on('SIGINT', close);
    process.on('SIGTERM', close);

    return true;
};
