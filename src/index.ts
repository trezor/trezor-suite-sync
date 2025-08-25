import { startGatePaymentServer } from './gate/gate.js';
import { startEvoluRelay } from './evoluRelay/relay.js';
import { createLimitStorage } from './limitStorage/limitStorage.js';
import { mkdirSync } from 'fs';

const RELAY_PORT = 4000; // Todo: from ENV
const GATE_PAYMENT_SERVER_PORT = 4001; // Todo: from ENV

// Ensure the database is created in a predictable location for Docker.
mkdirSync('data', { recursive: true });
process.chdir('data');

const limitStorage = await createLimitStorage();

if (limitStorage !== null) {
    startEvoluRelay({ port: RELAY_PORT, limitStorage });
    startGatePaymentServer({ port: GATE_PAYMENT_SERVER_PORT, limitStorage });
}
