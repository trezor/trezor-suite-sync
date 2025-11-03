import type { LimitStorage } from '../../storage/limitStorage/limitStorage.js';
import type { ServerType } from '../server.js';
import { storgeAskEndpoint } from './endpoints/ask/storgeAskEndpoint.js';
import { storageRegisterEndpoint } from './endpoints/register/storageRegisterEndpoint.js';
import { storageTransferEndpoint } from './endpoints/transfer/storageTransferEndpoint.js';

export type RegisterStorageEndpointsDeps = {
    server: ServerType;
    limitStorage: LimitStorage;
};

export const registerStorageEndpoints = ({
    server,
    limitStorage,
}: RegisterStorageEndpointsDeps) => {
    server.post(
        '/storage/add',
        storageTransferEndpoint.schema,
        storageTransferEndpoint.createHandler({ limitStorage }),
    );
    server.get(
        '/storage/ask',
        storgeAskEndpoint.schema,
        storgeAskEndpoint.createHandler({ limitStorage }),
    );
    server.post(
        '/storage/register',
        storageRegisterEndpoint.schema,
        storageRegisterEndpoint.createHandler({ limitStorage }),
    );
};
