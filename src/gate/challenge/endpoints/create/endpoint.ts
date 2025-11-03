import { challengeCreateHandler } from './handler.js';
import { challengeCreateRequestSchema } from './schema.js';
import { EndpointDescriptor } from '../../../../EndpointDescriptor.js';

export const challengeCreateEndpoint = {
    method: 'POST',
    path: '/challenge',
    schema: challengeCreateRequestSchema,
    createHandler: challengeCreateHandler,
} satisfies EndpointDescriptor;

export type ChallengeCreateEndpoint = typeof challengeCreateEndpoint;
