import { FastifyReply, FastifyRequest } from 'fastify';
import type { FromSchema } from 'json-schema-to-ts';

import { TransferOperationDeps, transferStorageOperation } from './operation.js';
import { transferEvoluSchema, transferRequestSchema } from './schema.js';
import { serializeTransferResponse } from './serializer.js';
import { exhaustive } from '../../../../exhaustive.js';

export type TransferHandlerDeps = TransferOperationDeps;

type TransferRequest = FastifyRequest<{
    Body: FromSchema<typeof transferRequestSchema.schema.body>;
}>;

export const transferHandler =
    (deps: TransferHandlerDeps) => (request: TransferRequest, reply: FastifyReply) => {
        const validationResult = transferEvoluSchema.from(request.body);

        if (!validationResult.ok) {
            return reply.code(400).send({ error: validationResult.error });
        }

        const result = transferStorageOperation(deps, validationResult.value);

        if (!result.ok) {
            const { type } = result.error;

            switch (type) {
                case 'SqliteError':
                    console.error(result.error);

                    return reply.code(500).send({ error: 'Internal server error' });

                case 'NoStorageAllowance':
                    return reply.code(400).send({ error: 'No storage allowance' });

                default:
                    return exhaustive(type);
            }
        }

        return reply.code(200).send(serializeTransferResponse(result.value));
    };
