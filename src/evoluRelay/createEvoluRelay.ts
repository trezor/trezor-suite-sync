import { type Port, type Task, waitForAbort } from '@evolu/common';
import { type RelayDeps, createRelay } from '@evolu/nodejs';

import { UpdateHealthDep } from '../health/createHealthServer.js';
import { GetLimitsForOwnerDep } from '../storage/limitStorage/methods/createGetLimitsForOwner.js';

export type EvoluRelayDeps = GetLimitsForOwnerDep & UpdateHealthDep;

export type EvoluRelayParams = {
    port: Port;
};

/**
 * Runs the relay until its Run is aborted, reporting the relay state to the health server.
 */
export type EvoluRelay = (params: EvoluRelayParams) => Task<never, never, RelayDeps>;

export type EvoluRelayDep = { evoluRelay: EvoluRelay };

export const createEvoluRelay =
    (deps: EvoluRelayDeps): EvoluRelay =>
    ({ port }) =>
    async run => {
        await using _relay = await run.ok(
            createRelay({
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

        deps.updateHealth({ relay: 'ok' });

        // Disposed before the relay, so health reports exiting while connections drain.
        using _reportExiting = {
            [Symbol.dispose]: () => deps.updateHealth({ relay: 'exiting' }),
        };

        return await run(waitForAbort);
    };
