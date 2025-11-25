import { err } from '@evolu/common';
import { FastifyReply, FastifyRequest } from 'fastify';

import { syncGetEvoluSchema } from './syncGetSchema.js';
import { exhaustive } from '../../../../exhaustive.js';

export type SyncGetHandlerDeps = {};

type SyncGetRequest = FastifyRequest<{
    Querystring: typeof syncGetEvoluSchema.Type;
}>;

export const syncGetHandler =
    (deps: SyncGetHandlerDeps) => (request: SyncGetRequest, reply: FastifyReply) => {
        // const { ownerId } = request.query;

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
