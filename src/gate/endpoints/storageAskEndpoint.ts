import type { EndpointDeps } from './Endpoint.js';

const schema = {
    schema: {
        querystring: {
            type: 'object',
            properties: {
                ownerId: { type: 'string' },
                publicKey: { type: 'string' },
            },
            required: [],
        },
    },
} as const;

export const storageAskEndpoint = ({ server, limitStorage }: EndpointDeps) => {
    server.post('/storage/ask', schema, (request, reply) => {
        const { ownerId, publicKey } = request.query;

        // Todo: implement

        return { ownerId, publicKey };
    });
};
