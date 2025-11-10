import { FastifyReply, FastifyRequest } from 'fastify';
import type { FromSchema } from 'json-schema-to-ts';

import { transferEvoluSchema, transferRequestSchema } from './storageTransferSchema.js';
import { exhaustive } from '../../../../exhaustive.js';
import { LimitStorage } from '../../../../storage/limitStorage/limitStorage.js';

export type TransferHandlerDeps = {
    limitStorage: LimitStorage;
};

type TransferRequest = FastifyRequest<{
    Body: FromSchema<typeof transferRequestSchema.schema.body>;
}>;

export const storageTransferHandler =
    (deps: TransferHandlerDeps) => (request: TransferRequest, reply: FastifyReply) => {
        const validationResult = transferEvoluSchema.from(request.body);

        if (!validationResult.ok) {
            return reply.code(400).send({ error: validationResult.error });
        }

        const { publicKey, ownerId, size } = validationResult.value;

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
