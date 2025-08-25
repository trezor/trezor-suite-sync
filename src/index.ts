import { startGatePaymentServer } from './gate/gate.js';
import { startEvoluRelay } from './evoluRelay/relay.js';

const RELAY_PORT = 4000; // Todo: from ENV
const GATE_PAYMENT_SERVER_PORT = 4001; // Todo: from ENV

startEvoluRelay({ port: RELAY_PORT });
startGatePaymentServer({ port: GATE_PAYMENT_SERVER_PORT });
