import type { JsonSchemaToTsProvider } from '@fastify/type-provider-json-schema-to-ts';
import type { FastifyBaseLogger, FastifyInstance } from 'fastify';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';

export type ServerType = FastifyInstance<
    Server<any, any>,
    IncomingMessage,
    ServerResponse<IncomingMessage>,
    FastifyBaseLogger,
    JsonSchemaToTsProvider<{}>
>;

export type BaseControllerDeps = {
    server: ServerType;
};

export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };
