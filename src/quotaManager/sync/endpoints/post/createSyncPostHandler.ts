import { syncPostEvoluSchema } from './syncPostSchema.js';
import { EndpointHandler } from '../../../../EndpointHandler.js';
import { IS_DEV_SERVER } from '../../../../env.js';

const DEFAULT_SUITE_SYNC_RELAY_URL = IS_DEV_SERVER
    ? 'https://suite-sync.suite.sldev.cz/evolu/'
    : 'https://suite-sync.trezor.io/';

export type SyncPostHandler = EndpointHandler<{
    Body: typeof syncPostEvoluSchema.Type;
}>;

export const createSyncPostHandler = (): SyncPostHandler => (request, reply) =>
    reply.code(200).send({
        url: DEFAULT_SUITE_SYNC_RELAY_URL,
    });
