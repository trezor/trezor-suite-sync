import { createConsole, createConsoleFormatter } from '@evolu/common';
import { createRelayDeps } from '@evolu/nodejs';

import { IS_DEV_SERVER } from '../env.js';

export const createEvoluRelayRunDeps = () => ({
    ...createRelayDeps(),
    console: createConsole({
        level: IS_DEV_SERVER ? 'debug' : 'info',
        formatter: createConsoleFormatter()({
            timestampFormat: 'relative',
        }),
    }),
});
