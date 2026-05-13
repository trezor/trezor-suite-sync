import { createConsole, createConsoleFormatter } from '@evolu/common';
import { createRelayDeps, createRun, startRelay } from '@evolu/nodejs';

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

        const run = createRun({
            ...createRelayDeps(),
            console,
        });
        const stack = new AsyncDisposableStack();
        let relayStarted = false;

        try {
            const relay = await run.orThrow(
                startRelay({
                    port,

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

            stack.use(relay);
            relayStarted = true;
            deps.updateHealth({ relay: 'ok' });

            await run.deps.shutdown;
        } catch (error) {
            console.error('Relay failed', error);
            deps.updateHealth({ relay: 'error' });

            return;
        } finally {
            if (relayStarted) {
                console.log('Evolu Relay is shutting down ...');
                deps.updateHealth({ relay: 'exiting' });
            }

            await stack[Symbol.asyncDispose]();
            await run[Symbol.asyncDispose]();
        }
    };
