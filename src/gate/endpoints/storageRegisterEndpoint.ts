import type { EndpointDeps } from './Endpoint.js';

const schema = {
    schema: {
        body: {
            type: 'object',
            properties: {
                publicKey: { type: 'string' },
                size: { type: 'number' },
                proof: { type: 'string' },
                timestamp: { type: 'number' },
            },
            required: ['publicKey', 'size', 'proof', 'timestamp'],
        },
    },
} as const;

export const storageRegisterEndpoint = ({ server, limitStorage }: EndpointDeps) => {
    server.post('/storage/register', schema, (request, reply) => {
        const { proof, size, timestamp, publicKey } = request.body;

        // Todo: implement checks

        const result = limitStorage.addLimitToPubkey({ publicKey, size });

        if (result === null) {
            return reply.code(400).send({ error: 'addLimitToPubkey failed (sql)' });
        }

        return reply.code(200).send({
            unspendStorageSize: result.unspendStorageSize,
            totalStorageSize: result.totalStorageSize,
        });
    });
};
