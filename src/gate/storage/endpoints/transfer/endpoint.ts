import { transferHandler } from './handler.js';
import { transferRequestSchema } from './schema.js';
import { EndpointDescriptor } from '../../../../EndpointDescriptor.js';
import { STORAGE_BASE_PATH } from '../path.js';

export const transferEndpoint = {
    method: 'POST',
    path: `${STORAGE_BASE_PATH}add`,
    schema: transferRequestSchema,
    createHandler: transferHandler,
} satisfies EndpointDescriptor;

export type TransferEndpoint = typeof transferEndpoint;
