import fastify from 'fastify';

import { banMiddleware } from './banMiddleware.js';
import { createCustomErrorHandler } from './createCustomErrorHandler.js';
import { evoluValidatorCompiler } from './evoluValidatorCompiler.js';
import { inputSanitizer } from './inputSanitizer.js';
import { ServerType } from './types.js';
import { UpdateHealthDep } from '../health/createHealthServer.js';

export type FastifyServerDeps = UpdateHealthDep;

export type FastifyServerDep = { fastifyServer: ServerType };

export const createFastifyServer = (deps: FastifyServerDeps): ServerType => {
    const fastifyServer = fastify();

    fastifyServer.addHook('onRequest', banMiddleware);
    fastifyServer.addHook('preValidation', inputSanitizer);

    fastifyServer.setValidatorCompiler(evoluValidatorCompiler);
    fastifyServer.setErrorHandler(createCustomErrorHandler(deps.updateHealth));

    return fastifyServer;
};
