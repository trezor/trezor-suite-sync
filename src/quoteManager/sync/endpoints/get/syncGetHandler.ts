import { err } from '@evolu/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import type { FromSchema } from 'json-schema-to-ts';

import { syncGetEvoluSchema, syncGetRequestSchema } from './syncGetSchema.js';
import { exhaustive } from '../../../../exhaustive.js';

export type SyncGetHandlerDeps = {};

type SyncGetRequest = FastifyRequest<{
    Querystring: FromSchema<typeof syncGetRequestSchema.schema.querystring>;
}>;

export const syncGetHandler =
    (deps: SyncGetHandlerDeps) => (request: SyncGetRequest, reply: FastifyReply) => {
        const validationResult = syncGetEvoluSchema.from(request.query);

        if (!validationResult.ok) {
            return reply.code(400).send({ error: validationResult.error });
        }

        // Todo: implement
        const result = err({ type: 'NotImplemented' as const });

        if (!result.ok) {
            const { type } = result.error;

            switch (type) {
                case 'NotImplemented':
                    return reply.code(400).send({ error: type });

                default:
                    return exhaustive(type);
            }
        }

        return reply.code(200).send({});
    };
