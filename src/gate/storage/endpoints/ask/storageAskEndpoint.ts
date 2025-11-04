import { storageAskHandler } from './storageAskHandler.js';
import { storageAskRequestSchema } from './storageAskSchema.js';
import { EndpointDescriptor } from '../../../../EndpointDescriptor.js';

export const storageAskEndpoint = {
    schema: storageAskRequestSchema,
    createHandler: storageAskHandler,
} satisfies EndpointDescriptor;
