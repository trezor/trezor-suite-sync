import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

import { UpdateHealthDep } from '../health/createHealthServer.js';

export const createCustomErrorHandler =
    (updateHealth: UpdateHealthDep['updateHealth']) =>
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
