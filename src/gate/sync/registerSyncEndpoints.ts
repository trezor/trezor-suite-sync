import type { ServerType } from '../server.js';
import { syncGetEndpoint } from './endpoints/get/endpoint.js';

export type RegisterSyncEndpointsDeps = {
    server: ServerType;
    // Add dependencies when sync is implemented
};

/**
 * Registers all sync-related endpoints with the Fastify server.
 *
 * @param deps - Dependencies required by sync endpoints
 * @param deps.server - Fastify server instance to register routes on
 */
export const registerSyncEndpoints = ({ server }: RegisterSyncEndpointsDeps) => {
    // Register sync GET endpoint: GET /sync
    server.get(syncGetEndpoint.path, syncGetEndpoint.schema, syncGetEndpoint.createHandler({}));
};
