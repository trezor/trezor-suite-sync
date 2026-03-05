import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 *  We generally allow access to Quota Manager from any suite -> which can be also self-hosted by our users, so thus we allow any origin.
 */
export const allowOriginMiddleware = (
    _request: FastifyRequest,
    reply: FastifyReply,
    done: () => void,
) => {
    reply.header('access-control-allow-origin', '*');

    done();
};
