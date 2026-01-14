import fastifyMiddie from '@fastify/middie';
import fastify from 'fastify';

import { banMiddleware } from './banMiddleware.js';
import { createCustomErrorHandler } from './createCustomErrorHandler.js';
import { evoluValidatorCompiler } from './evoluValidatorCompiler.js';
import { ServerType } from './types.js';
import { UpdateHealthDep } from '../health/startHealthServer.js';

export type FastifyServerDeps = UpdateHealthDep;

export type FastifyServerDep = { fastifyServer: ServerType };

export const createFastifyServer = (deps: FastifyServerDeps): ServerType => {
    const fastifyServer = fastify();

    fastifyServer.register(fastifyMiddie);
    fastifyServer.use(banMiddleware);

    fastifyServer.setValidatorCompiler(evoluValidatorCompiler);
    fastifyServer.setErrorHandler(createCustomErrorHandler(deps.updateHealth));

    return fastifyServer;
};
