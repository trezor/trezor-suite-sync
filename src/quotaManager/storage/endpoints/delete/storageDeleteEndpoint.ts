import { storageDeleteHandler } from './storageDeleteHandler.js';
import { deleteRequestSchema } from './storageDeleteSchema.js';
import { EndpointDescriptor } from '../../../../EndpointDescriptor.js';

export const storageDeleteEndpoint = {
    schema: deleteRequestSchema,
    createHandler: storageDeleteHandler,
} satisfies EndpointDescriptor;
