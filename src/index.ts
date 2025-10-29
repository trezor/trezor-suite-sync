import 'dotenv/config';
import { mkdirSync } from 'fs';
import { join } from 'path';

import { startEvoluRelay } from './evoluRelay/relay.js';
import { startGatePaymentServer } from './gate/gate.js';
import { createAppStorage } from './storage.js';

const RELAY_PORT = process.env.RELAY_PORT ? parseInt(process.env.RELAY_PORT, 10) : 4000;
const GATE_PAYMENT_SERVER_PORT = process.env.GATE_PORT ? parseInt(process.env.GATE_PORT, 10) : 4001;
const DATA_DIR = process.env.DATA_DIR || 'data';

const dataPath = join(process.cwd(), DATA_DIR);
mkdirSync(dataPath, { recursive: true });
process.chdir(dataPath);

const storage = await createAppStorage();

if (storage.ok) {
    const { limitStorage, challengeStorage } = storage.value;

    startEvoluRelay({ port: RELAY_PORT, limitStorage });
    startGatePaymentServer({
        port: GATE_PAYMENT_SERVER_PORT,
        limitStorage,
        challengeStorage,
    });
} else {
    console.error('Cannot start server, error: ', storage.error);
}
