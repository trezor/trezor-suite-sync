import { FastifyReply, FastifyRequest } from 'fastify';

import { transferEvoluSchema } from './storageTransferSchema.js';
import { exhaustive } from '../../../../exhaustive.js';
import { LimitStorage } from '../../../../storage/limitStorage/limitStorage.js';

export type TransferHandlerDeps = {
    limitStorage: LimitStorage;
};

type TransferRequest = FastifyRequest<{
    Body: typeof transferEvoluSchema.Type;
}>;

export const storageTransferHandler =
    (deps: TransferHandlerDeps) => (request: TransferRequest, reply: FastifyReply) => {
        const { publicKey, ownerId, size } = request.body;

        const result = deps.limitStorage.transferSpaceLimitToOwner({ publicKey, ownerId, size });

        if (!result.ok) {
            const { type } = result.error;

            switch (type) {
                case 'SqliteError':
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
