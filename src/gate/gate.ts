import fastify from 'fastify';
import { syncEndpoint } from './endpoints/syncEndpoint.js';
import type { JsonSchemaToTsProvider } from '@fastify/type-provider-json-schema-to-ts';
import { storageRegisterEndpoint } from './endpoints/storageRegisterEndpoint.js';
import { storageAddEndpoint } from './endpoints/storageAddEndpoint.js';
import { storageAskEndpoint } from './endpoints/storageAskEndpoint.js';
import { storageDeleteEndpoint } from './endpoints/storageDeleteEndpoint.js';
import { challengeEndpoint } from './endpoints/challengeEndpoint.js';
import type { LimitStorage } from '../storage/limitStorage/limitStorage.js';
import type { ChallengeStorage } from '../storage/challengeStorage/challengeStorage.js';
import { randomBytes } from 'crypto';

const createRandomBytes = (size: number) => randomBytes(size).toString('hex');

type StartGatePaymentServerDependencies = {
    port: number;
    limitStorage: LimitStorage;
    challengeStorage: ChallengeStorage;
};

export const startGatePaymentServer = async ({
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
        console.log(`Payment Server (Gate) started on ${address}`);
    });

    const close = () => {
        console.log('Payment Server (Gate) is shutting down...');
        server.close();
    };

    process.on('SIGINT', close);
    process.on('SIGTERM', close);
};
