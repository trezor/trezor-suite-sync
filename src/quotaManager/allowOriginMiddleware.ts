import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 *  We generally allow access to Quota Manager from any suite -> which can be also self-hosted by our users, so thus we allow any origin.
 */
export const allowOriginMiddleware = (
    request: FastifyRequest,
    reply: FastifyReply,
    done: () => void,
) => {
    reply.header('access-control-allow-origin', '*');
    reply.header('access-control-allow-methods', 'GET, POST, PUT, DELETE, OPTIONS');
    reply.header('access-control-allow-headers', '*');

    if (request.method === 'OPTIONS') {
        reply.status(204).send();

        return;
    }

    done();
};
