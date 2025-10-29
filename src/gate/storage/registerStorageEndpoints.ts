import type { LimitStorage } from '../../storage/limitStorage/limitStorage.js';
import type { ServerType } from '../server.js';
import { askEndpoint } from './endpoints/ask/endpoint.js';
import { registerEndpoint } from './endpoints/register/endpoint.js';
import { transferEndpoint } from './endpoints/transfer/endpoint.js';

export type RegisterStorageEndpointsDeps = {
    server: ServerType;
    limitStorage: LimitStorage;
};

export const registerStorageEndpoints = ({
    server,
    limitStorage,
}: RegisterStorageEndpointsDeps) => {
    // POST /storage/add
    server.post(
        transferEndpoint.path,
        transferEndpoint.schema,
        transferEndpoint.createHandler({ limitStorage }),
    );

    // GET /storage/ask
    server.get(askEndpoint.path, askEndpoint.schema, askEndpoint.createHandler({ limitStorage }));

    // POST /storage/register
    server.post(
        registerEndpoint.path,
        registerEndpoint.schema,
        registerEndpoint.createHandler({ limitStorage }),
    );
};
