import type { ServerType } from '../server.js';
import type { LimitStorage } from '../../storage/limitStorage/limitStorage.js';

export type EndpointDeps = {
    server: ServerType;
    limitStorage: LimitStorage;
};
