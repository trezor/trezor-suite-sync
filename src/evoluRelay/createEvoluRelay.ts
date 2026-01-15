import { Result, SqliteError, createConsole } from '@evolu/common';
import { Relay } from '@evolu/common/local-first';
import { createNodeJsRelay } from '@evolu/nodejs';

import { GetLimitsForOwnerDep } from '../storage/limitStorage/methods/createGetLimitsForOwner.js';

export type EvoluRelayDeps = GetLimitsForOwnerDep;

export type EvoluRelayParams = {
    port: number;
    shouldAuthenticate: boolean;
};

export type EvoluRelay = (params: EvoluRelayParams) => Promise<Result<Relay, SqliteError>>;

export const createEvoluRelay =
    (deps: EvoluRelayDeps): EvoluRelay =>
    async ({ port, shouldAuthenticate }) => {
        const evoluDeps = {
            console: createConsole(),
        };

        return await createNodeJsRelay(evoluDeps)({
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
    };
