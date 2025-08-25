import {createConsole} from "@evolu/common";
import {createNodeJsRelay} from "@evolu/nodejs";
import {mkdirSync} from "fs";
import fastify from 'fastify'

// ============================================
// =============== EVOLU RELAY ================

const deps = {
    console: createConsole(),
};

// Ensure the database is created in a predictable location for Docker.
mkdirSync("data", {recursive: true});
process.chdir("data");

const relay = await createNodeJsRelay(deps)({
    port: 4000,
    enableLogging: false,
});

process.on("SIGINT", relay[Symbol.dispose]);
process.on("SIGTERM", relay[Symbol.dispose]);


// ============================================
// =============== PAYMENT GATE ===============

const server = fastify()

server.get('/ping', async (request, reply) => {
    return 'pong 4';
})

server.listen({port: 8080}, (err, address) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    console.log(`Server listening at ${address}`)
})
