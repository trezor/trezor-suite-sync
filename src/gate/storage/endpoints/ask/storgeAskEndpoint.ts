import { storageAskRequestSchema } from './storageAskSchema.js';
import { storgeAskHandler } from './storgeAskHandler.js';
import { EndpointDescriptor } from '../../../../EndpointDescriptor.js';

export const storgeAskEndpoint = {
    schema: storageAskRequestSchema,
    createHandler: storgeAskHandler,
} satisfies EndpointDescriptor;
