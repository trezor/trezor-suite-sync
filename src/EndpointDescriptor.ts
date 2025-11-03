import { FastifyReply, FastifyRequest } from 'fastify';

export type EndpointDescriptor = {
    method: 'POST' | 'GET' | 'PUT' | 'DELETE';
    path: string;
    schema: unknown; // Todo: add type
    createHandler: (
        deps: any,
    ) => (request: FastifyRequest<any>, reply: FastifyReply) => FastifyReply;
};
