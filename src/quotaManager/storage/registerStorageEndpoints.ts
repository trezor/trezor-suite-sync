import type { ChallengeStorage } from '../../storage/challengeStorage/challengeStorage.js';
import type { LimitStorage } from '../../storage/limitStorage/limitStorage.js';
import type { ServerType } from '../types.js';
import { storageAddEndpoint } from './endpoints/add/storageAddEndpoint.js';
import { storageAskEndpoint } from './endpoints/ask/storageAskEndpoint.js';
import { storageDeleteEndpoint } from './endpoints/delete/storageDeleteEndpoint.js';
import { storageRegisterEndpoint } from './endpoints/register/storageRegisterEndpoint.js';

export type RegisterStorageEndpointsDeps = {
    server: ServerType;
    limitStorage: LimitStorage;
    challengeStorage: ChallengeStorage;
    maxStoragePerDevice?: number;
};

export const registerStorageEndpoints = ({
    server,
    limitStorage,
    challengeStorage,
    maxStoragePerDevice,
}: RegisterStorageEndpointsDeps) => {
    server.post(
        '/storage/add',
        storageAddEndpoint.schema,
        storageAddEndpoint.createHandler({ limitStorage, challengeStorage }),
    );
    server.get(
        '/storage/ask',
        storageAskEndpoint.schema,
        storageAskEndpoint.createHandler({ limitStorage }),
    );
    server.post(
        '/storage/register',
        storageRegisterEndpoint.schema,
        storageRegisterEndpoint.createHandler({
            limitStorage,
            challengeStorage,
            maxStoragePerDevice,
        }),
    );
    server.post(
        '/storage/delete',
        storageDeleteEndpoint.schema,
        storageDeleteEndpoint.createHandler({ limitStorage }),
    );
};
