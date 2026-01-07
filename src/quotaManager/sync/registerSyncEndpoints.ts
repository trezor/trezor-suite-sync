import type { ServerType } from '../types.js';
import { syncPostEndpoint } from './endpoints/post/syncPostEndpoint.js';

export type RegisterSyncEndpointsDeps = {
    server: ServerType;
};

export const registerSyncEndpoints = ({ server }: RegisterSyncEndpointsDeps) => {
    server.post('/sync', syncPostEndpoint.schema, syncPostEndpoint.createHandler({}));
};
