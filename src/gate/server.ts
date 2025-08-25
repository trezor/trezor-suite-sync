import type {FastifyBaseLogger, FastifyInstance} from "fastify";
import type {IncomingMessage, Server, ServerResponse} from "node:http";
import type {JsonSchemaToTsProvider} from "@fastify/type-provider-json-schema-to-ts";

export type ServerType = FastifyInstance<Server<any, any>, IncomingMessage, ServerResponse<IncomingMessage>, FastifyBaseLogger, JsonSchemaToTsProvider<{}>>
