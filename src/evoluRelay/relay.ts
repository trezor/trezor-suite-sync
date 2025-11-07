import { createConsole } from '@evolu/common';
import { createNodeJsRelay } from '@evolu/nodejs';

import type { LimitStorage } from '../storage/limitStorage/limitStorage.js';

type StartEvoluRelayDependencies = {
    port: number;
    limitStorage: LimitStorage;
};

export const startEvoluRelay = async ({ port, limitStorage }: StartEvoluRelayDependencies) => {
    const deps = {
        console: createConsole(),
    };

    const relay = await createNodeJsRelay(deps)({
        port,
        enableLogging: true,
        authenticateOwner: ownerId =>
            // const result = limitStorage.getLimitForOwner({ ownerId });
            // return Promise.resolve(result.ok && result.value !== null && result.value > 0);
            Promise.resolve(true), // Todo: implement

        // Todo: implement the storage check on-write. Something like:
        // onWrite: ({ used, ownerId }) => {
        //     const limit = limitStorage.getLimitForOwner({ ownerId });
        //
        //     return limit !== null && used < limit;
        // },
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
