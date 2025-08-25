import fastify from "fastify";
import {createConsole, createSqlite, getOrThrow, SimpleName} from "@evolu/common";
import {createBetterSqliteDriver} from "@evolu/nodejs";

type StartGatePaymentServerParams = {
    port: number
}

export const startGatePaymentServer = async ({port}: StartGatePaymentServerParams) => {
    const server = fastify()

    // For now, using the SQLite implementation from Evolu to simply store the limits in plain SQL

    const deps = {
        console: createConsole(),
    };

    const name = getOrThrow(SimpleName.from("gate-payment-server"))
    const sqlite = getOrThrow(
        await createSqlite({
            ...deps,
            createSqliteDriver: createBetterSqliteDriver,
        })(name),
    );
    // sqlite.exec()

    server.get('/sync', async (request, reply) => {
        return 'pong 4';
    })

    server.listen({port}, (err, address) => {
        if (err) {
            console.error(err)
            process.exit(1)
        }
        console.log(`Gate server started on ${address}`)
    })
}
