import { storageTransferHandler } from './storageTransferHandler.js';
import { transferRequestSchema } from './storageTransferSchema.js';
import { EndpointDescriptor } from '../../../../EndpointDescriptor.js';

export const storageTransferEndpoint = {
    schema: transferRequestSchema,
    createHandler: storageTransferHandler,
} satisfies EndpointDescriptor;
