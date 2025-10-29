import { FastifyReply, FastifyRequest } from 'fastify';
import type { FromSchema } from 'json-schema-to-ts';

import { AskOperationDeps, askStorageByOwnerId, askStorageByPublicKey } from './operation.js';
import { askEvoluSchema, askRequestSchema } from './schema.js';
import { serializeAskByOwnerResponse, serializeAskByPublicKeyResponse } from './serializer.js';
import { exhaustive } from '../../../../exhaustive.js';

export type AskHandlerDeps = AskOperationDeps;

type AskRequest = FastifyRequest<{
    Querystring: FromSchema<typeof askRequestSchema.schema.querystring>;
}>;

export const askHandler = (deps: AskHandlerDeps) => (request: AskRequest, reply: FastifyReply) => {
    const validationResult = askEvoluSchema.from(request.query);

    if (!validationResult.ok) {
        return reply.code(400).send({ error: validationResult.error });
    }

    const { ownerId, publicKey } = validationResult.value;

    if (ownerId !== undefined) {
        const result = askStorageByOwnerId(deps, ownerId);

        if (!result.ok) {
            const { type } = result.error;

            switch (type) {
                case 'SqliteError':
                    console.error(result.error);

                    return reply.code(500).send({ error: 'Internal server error' });

                case 'OwnerNotFound':
                    return reply.code(404).send({ error: 'Owner not found' });

                case 'PublicKeyNotFound':
                    // This shouldn't happen for ownerId query, but handle it anyway
                    return reply.code(404).send({ error: 'Not found' });

                default:
                    return exhaustive(type);
            }
        }

        return reply.code(200).send(serializeAskByOwnerResponse(result.value));
    }

    if (publicKey !== undefined) {
        const result = askStorageByPublicKey(deps, publicKey);

        if (!result.ok) {
            const { type } = result.error;

            switch (type) {
                case 'SqliteError':
                    console.error(result.error);

                    return reply.code(500).send({ error: 'Internal server error' });

                case 'PublicKeyNotFound':
                    return reply.code(404).send({ error: 'Public key not found' });

                case 'OwnerNotFound':
                    // This shouldn't happen for publicKey query, but handle it anyway
                    return reply.code(404).send({ error: 'Not found' });

                default:
                    return exhaustive(type);
            }
        }

        return reply.code(200).send(serializeAskByPublicKeyResponse(result.value));
    }

    return reply.code(400).send({ error: 'Either ownerId or publicKey is required' });
};
