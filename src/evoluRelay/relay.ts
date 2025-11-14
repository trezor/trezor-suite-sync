import { createConsole } from '@evolu/common';
import { createNodeJsRelay } from '@evolu/nodejs';

import type { LimitStorage } from '../storage/limitStorage/limitStorage.js';

type StartEvoluRelayDependencies = {
    port: number;
    limitStorage: LimitStorage;
};

const forceAuthFreeAccess = true;

export const startEvoluRelay = async ({ port, limitStorage }: StartEvoluRelayDependencies) => {
    const deps = {
        console: createConsole(),
    };

    const relay = await createNodeJsRelay(deps)({
        port,
        enableLogging: true,
        /**
         * Owner is allowed to access the relay if they have any registered storage limit.
         */
        isOwnerAllowed(ownerId) {
            const result = limitStorage.getLimitForOwner({ ownerId });

            // TEMP: until we implement in Trezor Suite
            if (forceAuthFreeAccess) {
                return Promise.resolve(true);
            }

            return Promise.resolve(result.ok && result.value !== null);
        },
        /**
         * Owner is allowed to write if his usedBytes + requiredBytes <= storage limit.
         * NOTE: Required bytes are not only required bytes for upload, but also the already used storage.
         */
        isOwnerWithinQuota(ownerId, requiredBytes) {
            const result = limitStorage.getLimitForOwner({ ownerId });

            // TEMP: until we implement in Trezor Suite
            if (forceAuthFreeAccess) {
                return Promise.resolve(true);
            }

            return Promise.resolve(
                result.ok && result.value !== null && result.value >= requiredBytes,
            );
        },
    });

    if (!relay.ok) {
        console.error('Relay failed', relay.error);

        return;
    }

    const dispose = () => {
        // eslint-disable-next-line no-console
        console.log('Evolu Relay is shutting down ...');
        relay.value[Symbol.dispose]();
    };

    process.on('SIGINT', dispose);
    process.on('SIGTERM', dispose);
};
