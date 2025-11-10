import { ServerType } from './server.js';

export type BaseControllerDeps = {
    server: ServerType;
};

export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };
