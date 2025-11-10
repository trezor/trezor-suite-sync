import { FastifyReply, FastifyRequest } from 'fastify';
import type { FromSchema } from 'json-schema-to-ts';

import {
    storageRegisterEvoluSchema,
    storageRegisterRequestSchema,
} from './storageRegisterSchema.js';
import { exhaustive } from '../../../../exhaustive.js';
import { LimitStorage } from '../../../../storage/limitStorage/limitStorage.js';

export type RegisterHandlerDeps = {
    limitStorage: LimitStorage;
};

type RegisterRequest = FastifyRequest<{
    Body: FromSchema<typeof storageRegisterRequestSchema.schema.body>;
}>;

export const storageRegisterHandler =
    (deps: RegisterHandlerDeps) => (request: RegisterRequest, reply: FastifyReply) => {
        const validationResult = storageRegisterEvoluSchema.from(request.body);

        if (!validationResult.ok) {
            return reply.code(400).send({ error: validationResult.error });
        }

        const { publicKey, size } = validationResult.value;

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
