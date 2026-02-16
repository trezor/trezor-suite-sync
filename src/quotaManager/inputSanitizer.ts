import type { FastifyReply, FastifyRequest } from 'fastify';

import { sanitizeNullBytesDeep } from '../utils/sanitizeNullBytesDeep.js';

/**
 * Fastify `preValidation` hook adapter to sanitize the input to prevent null bytes from being injected into the request.
 */
export const inputSanitizer = (request: FastifyRequest, reply: FastifyReply, done: () => void) => {
    try {
        if (request.body) {
            request.body = sanitizeNullBytesDeep(request.body);
        }
    } catch {
        reply.status(400).send({ error: 'Bad Request', message: 'Invalid request body' });

        return;
    }

    try {
        if (request.query) {
            request.query = sanitizeNullBytesDeep(request.query);
        }
    } catch {
        reply.status(400).send({ error: 'Bad Request', message: 'Invalid query string' });

        return;
    }

    try {
        if ((request as any).params) {
            (request as any).params = sanitizeNullBytesDeep((request as any).params);
        }
    } catch {
        reply.status(400).send({ error: 'Bad Request', message: 'Invalid route parameters' });

        return;
    }

    done();
};
