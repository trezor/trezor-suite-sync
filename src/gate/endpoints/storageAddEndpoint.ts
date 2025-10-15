import type { EndpointDeps } from './Endpoint.js';
import { exhaustive } from '../../exhaustive.js';

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

        const result = limitStorage.transferSpaceLimitToOwner({ publicKey, ownerId, size });

        if (!result.ok) {
            const errorType = result.error.type;

            switch (errorType) {
                case 'SqliteError':
                    console.error(result);
                    return reply.code(500).send();

                case 'NoStorageAllowance':
                    return reply.code(400).send({ error: result.error.message });

                default:
                    exhaustive(errorType);
            }

            return reply.code(400).send({ error: 'addLimitToPubkey failed (sql)' });
        }

        return { proof, size, timestamp, publicKey };
    });
};
