import {createConsole, createSqlite, getOrThrow, SimpleName} from "@evolu/common";
import {createNodeJsRelay} from "@evolu/nodejs";
import {mkdirSync} from "fs";

type StartEvoluRelayParams = {
    port: number;
}
export const startEvoluRelay = async ({port}: StartEvoluRelayParams) => {
    const deps = {
        console: createConsole(),
    };

    // Ensure the database is created in a predictable location for Docker.
    mkdirSync("data", {recursive: true});
    process.chdir("data");

    const relay = await createNodeJsRelay(deps)({
        port,
        enableLogging: false,
    });

    process.on("SIGINT", relay[Symbol.dispose]);
    process.on("SIGTERM", relay[Symbol.dispose]);
}
