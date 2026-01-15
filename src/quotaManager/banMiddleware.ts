import type { FastifyReply, FastifyRequest } from 'fastify';

const bannedSuiteVersions = ['ban-test'];

/**
 * Fastify `onRequest` hook adapter.
 */
export const banMiddleware = (request: FastifyRequest, reply: FastifyReply, done: () => void) => {
    const incomingSuiteVersion = String(
        (request.headers as Record<string, unknown>)['suite-version'] ?? '',
    );

    if (bannedSuiteVersions.includes(incomingSuiteVersion)) {
        void reply
            .code(403)
            .type('application/json')
            .send({ error: 'BANNED_CLIENT_VERSION', version: incomingSuiteVersion });

        return;
    }

    done();
};
