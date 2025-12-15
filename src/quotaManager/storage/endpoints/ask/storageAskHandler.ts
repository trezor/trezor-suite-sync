import { FastifyReply, FastifyRequest } from 'fastify';

import { askEvoluSchema } from './storageAskSchema.js';
import { exhaustive } from '../../../../exhaustive.js';
import { LimitStorage } from '../../../../storage/limitStorage/limitStorage.js';

export type AskHandlerDeps = {
    limitStorage: LimitStorage;
};

type AskRequest = FastifyRequest<{
    Querystring: typeof askEvoluSchema.Type;
}>;

export const storageAskHandler =
    (deps: AskHandlerDeps) => async (request: AskRequest, reply: FastifyReply) => {
        const { ownerId, publicKey } = request.query;

        if (ownerId !== undefined) {
            const result = await deps.limitStorage.getLimitForOwner({ ownerId });

            if (!result.ok) {
                const { type } = result.error;

                switch (type) {
                    case 'DatabaseError':
                        console.error(result.error);

                        return reply.code(500).send({ error: 'Internal server error' });

                    default:
                        return exhaustive(type);
                }
            }

            if (result.value === null) {
                return reply.code(404).send({ error: 'OwnerNotFound' });
            }

            return reply.code(200).send({ totalSpace: result.value });
        }

        if (publicKey !== undefined) {
            const result = await deps.limitStorage.getLimitForPubkey({ publicKey });

            if (!result.ok) {
                const { type } = result.error;

                switch (type) {
                    case 'DatabaseError':
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
