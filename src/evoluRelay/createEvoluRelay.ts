import { createConsole } from '@evolu/common';
import { createNodeJsRelay } from '@evolu/nodejs';

import { UpdateHealthDep } from '../health/createHealthServer.js';
import { GetLimitsForOwnerDep } from '../storage/limitStorage/methods/createGetLimitsForOwner.js';

export type EvoluRelayDeps = GetLimitsForOwnerDep & UpdateHealthDep;

export type EvoluRelayParams = {
    port: number;
    shouldAuthenticate: boolean;
};

export type EvoluRelay = (params: EvoluRelayParams) => Promise<void>;

export type EvoluRelayDep = { evoluRelay: EvoluRelay };

export const createEvoluRelay =
    (deps: EvoluRelayDeps): EvoluRelay =>
    async ({ port, shouldAuthenticate }) => {
        const evoluDeps = {
            console: createConsole(),
        };

        const relayResult = await createNodeJsRelay(evoluDeps)({
            port,
            enableLogging: true,
            /**
             * Owner is allowed to access the relay if they have any registered storage limit.
             */
            async isOwnerAllowed(ownerId) {
                const result = await deps.getLimitsForOwner({ ownerId });

                if (!shouldAuthenticate) {
                    return Promise.resolve(true);
                }

                return Promise.resolve(result.ok && result.value !== null);
            },

            /**
             * Owner is allowed to write if his usedBytes + requiredBytes <= storage limit.
             * NOTE: Required bytes are not only required bytes for upload, but also the already used storage.
             */
            async isOwnerWithinQuota(ownerId, requiredBytes) {
                const result = await deps.getLimitsForOwner({ ownerId });

                if (!shouldAuthenticate) {
                    return Promise.resolve(true);
                }

                return Promise.resolve(
                    result.ok && result.value !== null && result.value >= requiredBytes,
                );
            },
        });

        if (!relayResult.ok) {
            console.error('Relay failed', relayResult.error);
            deps.updateHealth({ relay: 'error' });

            return;
        }

        const dispose = () => {
            // eslint-disable-next-line no-console
            console.log('Evolu Relay is shutting down ...');
            deps.updateHealth({ relay: 'exiting' });

            if (relayResult.ok) relayResult.value[Symbol.dispose]();
        };

        process.on('SIGINT', dispose);
        process.on('SIGTERM', dispose);

        deps.updateHealth({ relay: 'ok' });
    };
