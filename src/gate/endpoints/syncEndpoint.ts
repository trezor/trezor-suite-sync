import type { EndpointDeps } from './Endpoint.js';

const schema = {
    schema: {
        querystring: {
            type: 'object',
            properties: {
                ownerId: { type: 'string' },
            },
            required: ['ownerId'],
        },
    },
} as const;

export const syncEndpoint = ({ server }: EndpointDeps) => {
    server.get('/sync', schema, (request, reply) => {
        const { ownerId } = request.query;

        // Todo: implement

        return { ownerId };
    });
};
