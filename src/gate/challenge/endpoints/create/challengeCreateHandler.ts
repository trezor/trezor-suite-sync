import { FastifyReply, FastifyRequest } from 'fastify';
import type { FromSchema } from 'json-schema-to-ts';

import {
    challengeCreateEvoluSchema,
    challengeCreateRequestSchema,
} from './challengeCreateSchema.js';
import {
    ChallengeCreateOperationDeps,
    createChallengeOperation,
} from './createChallengeOperation.js';
import { serializeChallengeCreateResponse } from './serializeChallengeCreateResponse.js';
import { exhaustive } from '../../../../exhaustive.js';

export type ChallengeCreateHandlerDeps = ChallengeCreateOperationDeps;

type ChallengeCreateRequest = FastifyRequest<{
    Body: FromSchema<typeof challengeCreateRequestSchema.schema.body>;
}>;

export const challengeCreateHandler =
    (deps: ChallengeCreateHandlerDeps) =>
    (request: ChallengeCreateRequest, reply: FastifyReply) => {
        const validationResult = challengeCreateEvoluSchema.from(request.body);

        if (!validationResult.ok) {
            return reply.code(400).send({ error: validationResult.error });
        }

        const result = createChallengeOperation(deps, validationResult.value);

        if (!result.ok) {
            const { type } = result.error;

            switch (type) {
                case 'SqliteError':
                    console.error(result.error);

                    return reply.code(500).send({ error: 'Internal server error' });

                case 'InvalidChallenge':
                    console.error(result.error);

                    return reply.code(500).send({ error: 'Internal server error' });

                default:
                    return exhaustive(type);
            }
        }

        return reply.code(200).send(serializeChallengeCreateResponse(result.value));
    };
