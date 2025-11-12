import type { FastifyBaseLogger, FastifyInstance } from 'fastify';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';

export type ServerType = FastifyInstance<
    Server<any, any>,
    IncomingMessage,
    ServerResponse<IncomingMessage>,
    FastifyBaseLogger
>;

export type BaseControllerDeps = {
    server: ServerType;
};

export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };
