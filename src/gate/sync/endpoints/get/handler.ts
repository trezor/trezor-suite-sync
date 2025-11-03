import { FastifyReply, FastifyRequest } from 'fastify';
import type { FromSchema } from 'json-schema-to-ts';

import { SyncOperationDeps, syncOperation } from './operation.js';
import { syncGetEvoluSchema, syncGetRequestSchema } from './schema.js';
import { serializeSyncGetResponse } from './serializer.js';
import { exhaustive } from '../../../../exhaustive.js';

export type SyncGetHandlerDeps = SyncOperationDeps;

type SyncGetRequest = FastifyRequest<{
    Querystring: FromSchema<typeof syncGetRequestSchema.schema.querystring>;
}>;

export const syncGetHandler =
    (deps: SyncGetHandlerDeps) => (request: SyncGetRequest, reply: FastifyReply) => {
        const validationResult = syncGetEvoluSchema.from(request.query);

        if (!validationResult.ok) {
            return reply.code(400).send({ error: validationResult.error });
        }

        const result = syncOperation(deps, validationResult.value);

        if (!result.ok) {
            const { type } = result.error;

            switch (type) {
                case 'NotImplemented':
                    return reply.code(501).send({ error: 'Not implemented' });

                default:
                    return exhaustive(type);
            }
        }

        return reply.code(200).send(serializeSyncGetResponse(result.value));
    };
