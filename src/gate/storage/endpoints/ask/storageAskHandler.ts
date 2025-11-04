import { FastifyReply, FastifyRequest } from 'fastify';
import type { FromSchema } from 'json-schema-to-ts';

import { askEvoluSchema, storageAskRequestSchema } from './storageAskSchema.js';
import { exhaustive } from '../../../../exhaustive.js';
import { LimitStorage } from '../../../../storage/limitStorage/limitStorage.js';

export type AskHandlerDeps = {
    limitStorage: LimitStorage;
};

type AskRequest = FastifyRequest<{
    Querystring: FromSchema<typeof storageAskRequestSchema.schema.querystring>;
}>;

export const storageAskHandler =
    (deps: AskHandlerDeps) => (request: AskRequest, reply: FastifyReply) => {
        const validationResult = askEvoluSchema.from(request.query);

        if (!validationResult.ok) {
            return reply.code(400).send({ error: validationResult.error });
        }

        const { ownerId, publicKey } = validationResult.value;

        if (ownerId !== undefined) {
            const result = deps.limitStorage.getLimitForOwner({ ownerId });

            if (!result.ok) {
                const { type } = result.error;

                switch (type) {
                    case 'SqliteError':
                        console.error(result.error);

                        return reply.code(500).send({ error: 'Internal server error' });

                    default:
                        return exhaustive(type);
                }
            }

            if (result.value === null) {
                return reply.code(404).send({ error: 'Owner not found' });
            }

            return reply.code(200).send({ totalSpace: result.value });
        }

        if (publicKey !== undefined) {
            const result = deps.limitStorage.getLimitForPubkey({ publicKey });

            if (!result.ok) {
                const { type } = result.error;

                switch (type) {
                    case 'SqliteError':
                        console.error(result.error);

                        return reply.code(500).send({ error: 'Internal server error' });

                    default:
                        return exhaustive(type);
                }
            }

            if (result.value === null) {
                return reply.code(404).send({ error: 'Public key not found' });
            }

            return reply.code(200).send({
                totalSpace: result.value.totalStorageSize,
                unspentSpace: result.value.unspendStorageSize,
            });
        }

        return reply.code(400).send({ error: 'Either ownerId or publicKey is required' });
    };
