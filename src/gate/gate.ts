import fastify from "fastify";
import {syncEndpoint} from "./endpoints/syncEndpoint.js";
import type {JsonSchemaToTsProvider} from "@fastify/type-provider-json-schema-to-ts";
import {storageRegisterEndpoint} from "./endpoints/storageRegisterEndpoint.js";
import {storageAddEndpoint} from "./endpoints/storageAddEndpoint.js";

type StartGatePaymentServerParams = {
    port: number
}

export const startGatePaymentServer = async ({port}: StartGatePaymentServerParams) => {
    const server = fastify().withTypeProvider<JsonSchemaToTsProvider>();

    syncEndpoint(server);
    storageRegisterEndpoint(server);
    storageAddEndpoint(server);


    server.listen({port}, (err, address) => {
        if (err) {
            console.error(err)
            process.exit(1)
        }
        console.log(`Gate server started on ${address}`)
    })
}
