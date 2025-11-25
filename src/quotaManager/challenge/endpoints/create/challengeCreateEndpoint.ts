import { challengeCreateHandler } from './challengeCreateHandler.js';
import { challengeCreateRequestSchema } from './challengeCreateSchema.js';
import { EndpointDescriptor } from '../../../../EndpointDescriptor.js';

export const challengeCreateEndpoint = {
    schema: challengeCreateRequestSchema,
    createHandler: challengeCreateHandler,
} satisfies EndpointDescriptor;
