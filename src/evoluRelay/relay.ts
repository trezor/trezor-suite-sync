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
        enableLogging: false,

        // Todo: implement some callback to validate that the `OwnerId` is known,
        //       and only for them the Evolu Relay will open (upgrade) connection to Websocket
        // validateConnection: ({ ownerId }) => {
        //     return limitStorage.isOwnerRegisterd({ ownerId });
        // },

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
