import { randomBytes } from 'crypto';
import fastify from 'fastify';

import { registerChallengeEndpoints } from './challenge/registerChallengeEndpoints.js';
import { evoluValidatorCompiler } from './evoluValidator.js';
import { registerStorageEndpoints } from './storage/registerStorageEndpoints.js';
import { registerSyncEndpoints } from './sync/registerSyncEndpoints.js';
import type { ChallengeStorage } from '../storage/challengeStorage/challengeStorage.js';
import type { LimitStorage } from '../storage/limitStorage/limitStorage.js';

const createRandomBytes = (size: number) => randomBytes(size).toString('hex');

type StartQuotaManagerServerDependencies = {
    port: number;
    limitStorage: LimitStorage;
    challengeStorage: ChallengeStorage;
};

export const startQuotaManagerServer = ({
    port,
    limitStorage,
    challengeStorage,
}: StartQuotaManagerServerDependencies) => {
    const server = fastify();

    server.setValidatorCompiler(evoluValidatorCompiler);

    registerStorageEndpoints({ server, limitStorage });
    registerSyncEndpoints({ server });
    registerChallengeEndpoints({ server, challengeStorage, createRandomBytes });

    server.listen({ port, host: '0.0.0.0' }, (err, address) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }

        // eslint-disable-next-line no-console
        console.log(`Payment Server (Quota Manager) started on ${address}`);
    });

    const close = () => {
        // eslint-disable-next-line no-console
        console.log('Payment Server (Quota Manager) is shutting down...');
        server.close();
    };

    process.on('SIGINT', close);
    process.on('SIGTERM', close);
};
