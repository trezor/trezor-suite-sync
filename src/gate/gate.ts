import fastify from 'fastify';
import { syncEndpoint } from './endpoints/syncEndpoint.js';
import type { JsonSchemaToTsProvider } from '@fastify/type-provider-json-schema-to-ts';
import { storageRegisterEndpoint } from './endpoints/storageRegisterEndpoint.js';
import { storageAddEndpoint } from './endpoints/storageAddEndpoint.js';
import type { LimitStorage } from '../limitStorage/limitStorage.js';
import { storageAskEndpoint } from './endpoints/storageAskEndpoint.js';
import { storageDeleteEndpoint } from './endpoints/storageDeleteEndpoint.js';

type StartGatePaymentServerParams = {
    port: number;
    limitStorage: LimitStorage;
};

export const startGatePaymentServer = async ({
    port,
    limitStorage,
}: StartGatePaymentServerParams) => {
    const server = fastify().withTypeProvider<JsonSchemaToTsProvider>();

    // Todo: rename to something like: configureSyncEndpoint or attachSyncEndpoint, ...
    //       to show it is adding an endpoint to the server

    syncEndpoint({ server, limitStorage });
    storageRegisterEndpoint({ server, limitStorage });
    storageAddEndpoint({ server, limitStorage });
    storageAskEndpoint({ server, limitStorage });
    storageDeleteEndpoint({ server, limitStorage });

    server.listen({ port, host: '0.0.0.0' }, (err, address) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log(`Gate server started on ${address}`);
    });
};
