import { createConsole } from '@evolu/common';
import { createNodeJsRelay } from '@evolu/nodejs';

import { UpdateHealth } from '../health/startHealthServer.js';
import type { LimitStorage } from '../storage/limitStorage/limitStorage.js';

type StartEvoluRelayDependencies = {
    port: number;
    limitStorage: LimitStorage;
    onHealthChange: UpdateHealth;
};

const shouldAuthenticate = process.env.SERVER_ENV !== 'dev';

export const startEvoluRelay = async ({
    port,
    limitStorage,
    onHealthChange,
}: StartEvoluRelayDependencies) => {
    const deps = {
        console: createConsole(),
    };

    const relay = await createNodeJsRelay(deps)({
        port,
        enableLogging: true,
        /**
         * Owner is allowed to access the relay if they have any registered storage limit.
         */
        async isOwnerAllowed(ownerId) {
            const result = await limitStorage.getLimitForOwner({ ownerId });

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
            const result = await limitStorage.getLimitForOwner({ ownerId });

            if (!shouldAuthenticate) {
                return Promise.resolve(true);
            }

            return Promise.resolve(
                result.ok && result.value !== null && result.value >= requiredBytes,
            );
        },
    });

    if (!relay.ok) {
        console.error('Relay failed', relay.error);
        onHealthChange({ relay: 'error' });

        return false;
    }

    const dispose = () => {
        // eslint-disable-next-line no-console
        console.log('Evolu Relay is shutting down ...');
        onHealthChange({ relay: 'exiting' });

        if (relay.ok) relay.value[Symbol.dispose]();
    };

    process.on('SIGINT', dispose);
    process.on('SIGTERM', dispose);

    onHealthChange({ relay: 'ok' });

    return true;
};
