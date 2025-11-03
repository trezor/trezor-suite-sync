import { SyncGetHandlerDeps, syncGetHandler } from './handler.js';
import { syncGetRequestSchema } from './schema.js';

export const syncGetEndpoint = {
    method: 'GET' as const,
    path: '/sync',
    schema: syncGetRequestSchema,
    createHandler: (deps: SyncGetHandlerDeps) => syncGetHandler(deps),
};

export type SyncGetEndpoint = typeof syncGetEndpoint;
