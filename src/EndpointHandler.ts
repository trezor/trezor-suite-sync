import { FastifyReply, FastifyRequest } from 'fastify';
import { RouteGenericInterface } from 'fastify/types/route.js';

export type EndpointHandler<T extends RouteGenericInterface> = (
    request: FastifyRequest<T>,
    reply: FastifyReply,
) => FastifyReply | Promise<FastifyReply>;
