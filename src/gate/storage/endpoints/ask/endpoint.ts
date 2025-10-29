import { AskHandlerDeps, askHandler } from './handler.js';
import { askRequestSchema } from './schema.js';
import { STORAGE_BASE_PATH } from '../path.js';

export const askEndpoint = {
    method: 'GET' as const,
    path: `${STORAGE_BASE_PATH}ask`,
    schema: askRequestSchema,
    createHandler: (deps: AskHandlerDeps) => askHandler(deps),
};

export type AskEndpoint = typeof askEndpoint;
