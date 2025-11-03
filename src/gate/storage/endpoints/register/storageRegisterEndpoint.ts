import { storageRegisterHandler } from './storageRegisterHandler.js';
import { storageRegisterRequestSchema } from './storageRegisterSchema.js';
import { EndpointDescriptor } from '../../../../EndpointDescriptor.js';

export const storageRegisterEndpoint = {
    schema: storageRegisterRequestSchema,
    createHandler: storageRegisterHandler,
} satisfies EndpointDescriptor;
