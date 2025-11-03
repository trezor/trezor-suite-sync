import { askHandler } from './handler.js';
import { askRequestSchema } from './schema.js';
import { EndpointDescriptor } from '../../../../EndpointDescriptor.js';
import { STORAGE_BASE_PATH } from '../path.js';

export const askEndpoint = {
    method: 'GET',
    path: `${STORAGE_BASE_PATH}ask`,
    schema: askRequestSchema,
    createHandler: askHandler,
} satisfies EndpointDescriptor;

export type AskEndpoint = typeof askEndpoint;
