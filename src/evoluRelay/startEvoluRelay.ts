import { EvoluRelay } from './createEvoluRelay.js';
import { IS_DEV_SERVER } from '../env.js';
import { UpdateHealth } from '../health/startHealthServer.js';

type StartEvoluRelayDependencies = {
    port: number;
    onHealthChange: UpdateHealth;
    evoluRelay: EvoluRelay;
};

const shouldAuthenticate = !IS_DEV_SERVER;

export const startEvoluRelay = async ({
    port,
    onHealthChange,
    evoluRelay,
}: StartEvoluRelayDependencies) => {
    const evoluStarted = await evoluRelay({ port, shouldAuthenticate });

    if (!evoluStarted.ok) {
        console.error('Relay failed', evoluStarted.error);
        onHealthChange({ relay: 'error' });

        return false;
    }

    const dispose = () => {
        // eslint-disable-next-line no-console
        console.log('Evolu Relay is shutting down ...');
        onHealthChange({ relay: 'exiting' });

        if (evoluStarted.ok) evoluStarted.value[Symbol.dispose]();
    };

    process.on('SIGINT', dispose);
    process.on('SIGTERM', dispose);

    onHealthChange({ relay: 'ok' });

    return true;
};
