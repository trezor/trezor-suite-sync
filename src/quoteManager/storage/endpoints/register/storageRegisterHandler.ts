import type { FastifyReply, FastifyRequest } from 'fastify';

import { storageRegisterEvoluSchema } from './storageRegisterSchema.js';
import { exhaustive } from '../../../../exhaustive.js';
import type { LimitStorage } from '../../../../storage/limitStorage/limitStorage.js';

export type RegisterHandlerDeps = {
    limitStorage: LimitStorage;
};

type RegisterRequest = FastifyRequest<{
    Body: typeof storageRegisterEvoluSchema.Type;
}>;

export const storageRegisterHandler =
    (deps: RegisterHandlerDeps) => (request: RegisterRequest, reply: FastifyReply) => {
        const { publicKey, size } = request.body;

        const result = deps.limitStorage.addLimitToPubkey({ publicKey, size });

        if (!result.ok) {
            const { type } = result.error;

            switch (type) {
                case 'SqliteError':
                case 'ConsistencyError':
                    console.error(result.error);

                    return reply.code(500).send({ error: 'Internal server error' });

                default:
                    return exhaustive(type);
            }
        }

        return reply.code(200).send({
            totalStorageSize: result.value.totalStorageSize,
            unspendStorageSize: result.value.unspendStorageSize,
        });
    };
