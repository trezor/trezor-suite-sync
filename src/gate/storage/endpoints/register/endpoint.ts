import { RegisterHandlerDeps, registerHandler } from './handler.js';
import { registerRequestSchema } from './schema.js';
import { STORAGE_BASE_PATH } from '../path.js';

export const registerEndpoint = {
    method: 'POST' as const,
    path: `${STORAGE_BASE_PATH}register`,
    schema: registerRequestSchema,
    createHandler: (deps: RegisterHandlerDeps) => registerHandler(deps),
};

export type RegisterEndpoint = typeof registerEndpoint;
