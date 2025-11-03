import { TransferHandlerDeps, transferHandler } from './handler.js';
import { transferRequestSchema } from './schema.js';
import { STORAGE_BASE_PATH } from '../path.js';

export const transferEndpoint = {
    method: 'POST' as const,
    path: `${STORAGE_BASE_PATH}add`,
    schema: transferRequestSchema,
    createHandler: (deps: TransferHandlerDeps) => transferHandler(deps),
};

export type TransferEndpoint = typeof transferEndpoint;
