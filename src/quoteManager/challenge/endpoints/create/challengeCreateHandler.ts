import { FastifyReply, FastifyRequest } from 'fastify';

import {
    ChallengeCreateOperationDeps,
    challengeCreateOperation,
} from './challengeCreateOperation.js';
import { challengeCreateEvoluSchema } from './challengeCreateSchema.js';
import { serializeChallengeCreateResponse } from './serializeChallengeCreateResponse.js';
import { exhaustive } from '../../../../exhaustive.js';

export type ChallengeCreateHandlerDeps = ChallengeCreateOperationDeps;

type ChallengeCreateRequest = FastifyRequest<{
    Body: typeof challengeCreateEvoluSchema.Type;
}>;

export const challengeCreateHandler =
    (deps: ChallengeCreateHandlerDeps) =>
    (request: ChallengeCreateRequest, reply: FastifyReply) => {
        const result = challengeCreateOperation(deps, request.body);

        if (!result.ok) {
            const { type } = result.error;

            switch (type) {
                case 'SqliteError':
                case 'InvalidChallenge':
                    console.error(result.error);

                    return reply.code(500).send({ error: 'Internal server error' });

                default:
                    return exhaustive(type);
            }
        }

        return reply.code(200).send(serializeChallengeCreateResponse(result.value));
    };
