import { FastifyReply, FastifyRequest } from 'fastify';
import type { FromSchema } from 'json-schema-to-ts';

import { RegisterOperationDeps, registerStorageOperation } from './operation.js';
import { registerEvoluSchema, registerRequestSchema } from './schema.js';
import { serializeRegisterResponse } from './serializer.js';
import { exhaustive } from '../../../../exhaustive.js';

export type RegisterHandlerDeps = RegisterOperationDeps;

type RegisterRequest = FastifyRequest<{
    Body: FromSchema<typeof registerRequestSchema.schema.body>;
}>;

export const registerHandler =
    (deps: RegisterHandlerDeps) => (request: RegisterRequest, reply: FastifyReply) => {
        const validationResult = registerEvoluSchema.from(request.body);

        if (!validationResult.ok) {
            return reply.code(400).send({ error: validationResult.error });
        }

        const { publicKey, size } = validationResult.value;

        const result = registerStorageOperation(deps, { publicKey, size });

        if (!result.ok) {
            const { type } = result.error;

            switch (type) {
                case 'SqliteError':
                    console.error(result.error);

                    return reply.code(500).send({ error: 'Internal server error' });

                case 'ConsistencyError':
                    console.error(result.error);

                    return reply.code(500).send({ error: 'Internal server error' });

                default:
                    return exhaustive(type);
            }
        }

        return reply.code(200).send(serializeRegisterResponse(result.value));
    };
