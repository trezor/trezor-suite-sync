import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

import { UpdateHealth } from '../health/startHealthServer.js';

export const createCustomErrorHandler =
    (updateHealth: UpdateHealth) =>
    (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
        const statusCode = error.statusCode || 500;

        if (statusCode && statusCode >= 500) {
            updateHealth({ quotaManager: 'error' });
            reply
                .status(statusCode)
                .send({ error: 'Internal server error', message: 'An unexpected error occurred' });
        } else {
            reply.status(statusCode).send({
                error: error.name || 'Error',
                message: error.message,
                ...(error.validation && { validation: error.validation }), // Include validation errors
            });
        }
    };
