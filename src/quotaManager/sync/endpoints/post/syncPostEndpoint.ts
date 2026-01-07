import { SyncPostHandlerDeps, syncPostHandler } from './syncPostHandler.js';
import { syncPostRequestSchema } from './syncPostSchema.js';
import { EndpointDescriptor } from '../../../../EndpointDescriptor.js';

export const syncPostEndpoint = {
    schema: syncPostRequestSchema,
    createHandler: (deps: SyncPostHandlerDeps) => syncPostHandler(deps),
} satisfies EndpointDescriptor;
