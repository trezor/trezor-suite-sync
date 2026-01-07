import { FastifyReply, FastifyRequest } from 'fastify';

import { syncPostEvoluSchema } from './syncPostSchema.js';
import { IS_DEV_SERVER } from '../../../../env.js';

const DEFAULT_SUITE_SYNC_RELAY_URL = IS_DEV_SERVER
    ? 'https://suite-sync.suite.sldev.cz/evolu/'
    : 'https://suite-sync.trezor.io/';

export type SyncPostHandlerDeps = {};

type SyncPostRequest = FastifyRequest<{
    Body: typeof syncPostEvoluSchema.Type;
}>;

export const syncPostHandler =
    (deps: SyncPostHandlerDeps) => (request: SyncPostRequest, reply: FastifyReply) =>
        reply.code(200).send({
            url: DEFAULT_SUITE_SYNC_RELAY_URL,
        });
