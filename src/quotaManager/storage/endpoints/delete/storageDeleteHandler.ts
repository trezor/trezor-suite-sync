import { FastifyReply, FastifyRequest } from 'fastify';

import { deleteEvoluSchema } from './storageDeleteSchema.js';
import { exhaustive } from '../../../../exhaustive.js';
import { LimitStorage } from '../../../../storage/limitStorage/limitStorage.js';

export type DeleteHandlerDeps = {
    limitStorage: LimitStorage;
};

type DeleteRequest = FastifyRequest<{
    Body: typeof deleteEvoluSchema.Type;
}>;

export const storageDeleteHandler =
    (deps: DeleteHandlerDeps) => async (request: DeleteRequest, reply: FastifyReply) => {
        const { publicKey, ownerId, size } = request.body;

        const result = await deps.limitStorage.transferSpaceLimitToOwner({
            publicKey,
            ownerId,
            size,
        });

        if (!result.ok) {
            const { type } = result.error;

            switch (type) {
                case 'DatabaseError':
                    console.error(result.error);

                    return reply.code(500).send({ error: 'Internal server error' });

                case 'NoStorageAllowance':
                    return reply.code(400).send({ error: type });

                default:
                    return exhaustive(type);
            }
        }

        return reply.code(200).send({
            storageLimit: result.value,
        });
    };
