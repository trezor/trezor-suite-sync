import type { EndpointDeps } from './Endpoint.js';

const schema = {
    schema: {
        body: {
            type: 'object',
            properties: {
                publicKey: { type: 'string' }, // donor
                ownerId: { type: 'string' }, // recipient
                size: { type: 'number' },
                proof: { type: 'string' },
                timestamp: { type: 'number' },
            },
            required: ['publicKey', 'ownerId', 'size', 'proof', 'timestamp'],
        },
    },
} as const;

export const storageAddEndpoint = ({ server, limitStorage }: EndpointDeps) => {
    server.post('/storage/add', schema, (request, reply) => {
        const { proof, size, timestamp, publicKey, ownerId } = request.body;

        // Todo: implement checks

        limitStorage.transferSpaceLimitToOwner({ publicKey, ownerId, size });

        return { proof, size, timestamp, publicKey };
    });
};
