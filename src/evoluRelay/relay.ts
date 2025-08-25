import { createConsole } from '@evolu/common';
import { createNodeJsRelay } from '@evolu/nodejs';
import type { LimitStorage } from '../limitStorage/limitStorage.js';

type StartEvoluRelayParams = {
    port: number;
    limitStorage: LimitStorage;
};

export const startEvoluRelay = async ({ port, limitStorage }: StartEvoluRelayParams) => {
    const deps = {
        console: createConsole(),
    };

    const relay = await createNodeJsRelay(deps)({
        port,
        enableLogging: false,

        // Todo: implement the storage check on-write. Something like:
        // onWrite: ({ used, ownerId }) => {
        //     const limit = limitStorage.getLimitForOwner({ ownerId });
        //
        //     return limit !== null && used < limit;
        // },
    });

    process.on('SIGINT', relay[Symbol.dispose]);
    process.on('SIGTERM', relay[Symbol.dispose]);
};
