import { ChallengeCreateHandlerDeps, challengeCreateHandler } from './handler.js';
import { challengeCreateRequestSchema } from './schema.js';

export const challengeCreateEndpoint = {
    method: 'POST' as const,
    path: '/challenge',
    schema: challengeCreateRequestSchema,

    createHandler: (deps: ChallengeCreateHandlerDeps) => challengeCreateHandler(deps),
};

export type ChallengeCreateEndpoint = typeof challengeCreateEndpoint;
