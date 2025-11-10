import { SyncGetHandlerDeps, syncGetHandler } from './syncGetHandler.js';
import { syncGetRequestSchema } from './syncGetSchema.js';
import { EndpointDescriptor } from '../../../../EndpointDescriptor.js';

export const syncGetEndpoint = {
    schema: syncGetRequestSchema,
    createHandler: (deps: SyncGetHandlerDeps) => syncGetHandler(deps),
} satisfies EndpointDescriptor;
