import { NextFunction } from '@fastify/middie';
import type { FastifyRequest } from 'fastify';
import type { IncomingMessage, ServerResponse } from 'http';

const bannedSuiteVersions = ['ban-test'];

/**
 * Middleware to block requests from banned Suite versions.
 * If the 'Suite-Version' header matches a banned version, respond with 403 Forbidden.
 */
export const banMiddleware = (
    req: FastifyRequest,
    res: ServerResponse<IncomingMessage>,
    next: NextFunction,
) => {
    // we access headers in a lowercase since the middie normalizes them
    const incomingSuiteVersion = String(req.headers['suite-version']);

    if (bannedSuiteVersions.includes(incomingSuiteVersion)) {
        res.statusCode = 403;
        res.setHeader('content-type', 'application/json');
        res.end(
            JSON.stringify({
                error: `BANNED_CLIENT_VERSION`,
                version: incomingSuiteVersion,
            }),
        );

        return res;
    }

    next();
};
