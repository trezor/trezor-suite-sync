import type { ServerType } from '../server.ts';

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

export const storageRegisterEndpoint = (server: ServerType) => {
    server.post('/storage/register', schema, (request, reply) => {
        const { proof, size, timestamp, publicKey } = request.body;

        // Todo: implement

        return { proof, size, timestamp, publicKey };
    });
};
