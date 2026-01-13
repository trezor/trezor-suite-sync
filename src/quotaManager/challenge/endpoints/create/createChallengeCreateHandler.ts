import { challengeCreateEvoluSchema } from './challengeCreateSchema.js';
import { ChallengeCreateOperationDep } from './createChallengeCreateOperation.js';
import { serializeChallengeCreateResponse } from './serializeChallengeCreateResponse.js';
import { EndpointHandler } from '../../../../EndpointHandler.js';
import { exhaustive } from '../../../../exhaustive.js';

export type ChallengeCreateHandlerDeps = ChallengeCreateOperationDep;

export type ChallengeCreateHandler = EndpointHandler<{
    Body: typeof challengeCreateEvoluSchema.Type;
}>;

export const createChallengeCreateHandler =
    (deps: ChallengeCreateHandlerDeps): ChallengeCreateHandler =>
    async (request, reply) => {
        const result = await deps.challengeCreateOperation(request.body);

        if (!result.ok) {
            const { type } = result.error;

            switch (type) {
                case 'DatabaseError':
                case 'InvalidChallenge':
                    console.error(result.error);

                    return reply.code(500).send({ error: 'Internal server error' });

                default:
                    return exhaustive(type);
            }
        }

        return reply.code(200).send(serializeChallengeCreateResponse(result.value));
    };
