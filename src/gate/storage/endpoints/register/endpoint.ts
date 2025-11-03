import { registerHandler } from './handler.js';
import { registerRequestSchema } from './schema.js';
import { EndpointDescriptor } from '../../../../EndpointDescriptor.js';
import { STORAGE_BASE_PATH } from '../path.js';

export const registerEndpoint = {
    method: 'POST',
    path: `${STORAGE_BASE_PATH}register`,
    schema: registerRequestSchema,
    createHandler: registerHandler,
} satisfies EndpointDescriptor;

export type RegisterEndpoint = typeof registerEndpoint;
