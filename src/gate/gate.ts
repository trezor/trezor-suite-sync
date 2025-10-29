import type { JsonSchemaToTsProvider } from '@fastify/type-provider-json-schema-to-ts';
import { randomBytes } from 'crypto';
import fastify from 'fastify';

import { challengeEndpoint } from './endpoints/challengeEndpoint.js';
import { storageAddEndpoint } from './endpoints/storageAddEndpoint.js';
import { storageAskEndpoint } from './endpoints/storageAskEndpoint.js';
import { storageDeleteEndpoint } from './endpoints/storageDeleteEndpoint.js';
import { storageRegisterEndpoint } from './endpoints/storageRegisterEndpoint.js';
import { syncEndpoint } from './endpoints/syncEndpoint.js';
import type { ChallengeStorage } from '../storage/challengeStorage/challengeStorage.js';
import type { LimitStorage } from '../storage/limitStorage/limitStorage.js';

const createRandomBytes = (size: number) => randomBytes(size).toString('hex');

type StartGatePaymentServerDependencies = {
    port: number;
    limitStorage: LimitStorage;
    challengeStorage: ChallengeStorage;
};

export const startGatePaymentServer = ({
    port,
    limitStorage,
    challengeStorage,
}: StartGatePaymentServerDependencies) => {
    const server = fastify().withTypeProvider<JsonSchemaToTsProvider>();

    // Todo: rename to something like: configureSyncEndpoint or attachSyncEndpoint, ...
    //       to show it is adding an endpoint to the server

    syncEndpoint({ server, limitStorage });
    challengeEndpoint({ server, challengeStorage, createRandomBytes });
    storageRegisterEndpoint({ server, limitStorage });
    storageAddEndpoint({ server, limitStorage });
    storageAskEndpoint({ server, limitStorage });
    storageDeleteEndpoint({ server, limitStorage });

    server.listen({ port, host: '0.0.0.0' }, (err, address) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        // eslint-disable-next-line no-console
        console.log(`Payment Server (Gate) started on ${address}`);
    });

    const close = () => {
        // eslint-disable-next-line no-console
        console.log('Payment Server (Gate) is shutting down...');
        server.close();
    };

    process.on('SIGINT', close);
    process.on('SIGTERM', close);
};
