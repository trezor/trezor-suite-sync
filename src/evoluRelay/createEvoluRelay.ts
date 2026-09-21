import { Port, createConsole, createConsoleFormatter, ok } from '@evolu/common';
import { createRelay, createRelayDeps, runMain } from '@evolu/nodejs';

import { IS_DEV_SERVER } from '../env.js';
import { UpdateHealthDep } from '../health/createHealthServer.js';
import { GetLimitsForOwnerDep } from '../storage/limitStorage/methods/createGetLimitsForOwner.js';

export type EvoluRelayDeps = GetLimitsForOwnerDep & UpdateHealthDep;

export type EvoluRelayParams = {
    port: number;
};

export type EvoluRelay = (params: EvoluRelayParams) => Promise<void>;

export type EvoluRelayDep = { evoluRelay: EvoluRelay };

export const createEvoluRelay =
    (deps: EvoluRelayDeps): EvoluRelay =>
    async ({ port }) => {
        const console = createConsole({
            level: IS_DEV_SERVER ? 'debug' : 'info',
            formatter: createConsoleFormatter()({
                timestampFormat: 'relative',
            }),
        });

        let relayStarted = false;

        await runMain({ ...createRelayDeps(), console })(async run => {
            const relay = await run.ok(
                createRelay({
                    port: Port.orThrow(port),

                    /**
                     * Owner is allowed to access the relay if they have any registered storage limit.
                     */
                    async isOwnerAllowed(ownerId) {
                        const result = await deps.getLimitsForOwner({ ownerId });

                        return Promise.resolve(result.ok && result.value !== null);
                    },

                    /**
                     * Owner is allowed to write if his usedBytes + requiredBytes <= storage limit.
                     * NOTE: Required bytes are not only required bytes for upload, but also the already used storage.
                     */
                    async isOwnerWithinQuota(ownerId, requiredBytes) {
                        const result = await deps.getLimitsForOwner({ ownerId });

                        return Promise.resolve(
                            result.ok && result.value !== null && result.value >= requiredBytes,
                        );
                    },
                }),
            );

            relayStarted = true;
            deps.updateHealth({ relay: 'ok' });

            // Relay ownership is transferred to runMain, which disposes it on shutdown.
            return ok(relay);
        });

        if (relayStarted) {
            console.log('Evolu Relay is shutting down ...');
            deps.updateHealth({ relay: 'exiting' });
        } else {
            deps.updateHealth({ relay: 'error' });
        }
    };
