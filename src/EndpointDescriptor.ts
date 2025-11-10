import { FastifyReply, FastifyRequest } from 'fastify';

export type EndpointDescriptor = {
    schema: unknown; // Todo: add type
    createHandler: (
        deps: any,
    ) => (request: FastifyRequest<any>, reply: FastifyReply) => FastifyReply | Promise<FastifyReply>;
};
