import type { ServerType } from '../types.js';
import { syncGetEndpoint } from './endpoints/get/syncGetEndpoint.js';

export type RegisterSyncEndpointsDeps = {
    server: ServerType;
};

export const registerSyncEndpoints = ({ server }: RegisterSyncEndpointsDeps) => {
    server.get('/sync', syncGetEndpoint.schema, syncGetEndpoint.createHandler({}));
};
