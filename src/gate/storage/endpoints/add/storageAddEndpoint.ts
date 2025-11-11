import { storageAddHandler } from './storageAddHandler.js';
import { storageAddRequestSchema } from './storageAddSchema.js';
import { EndpointDescriptor } from '../../../../EndpointDescriptor.js';

export const storageAddEndpoint = {
    schema: storageAddRequestSchema,
    createHandler: storageAddHandler,
} satisfies EndpointDescriptor;
