import type { EndpointDeps } from './Endpoint.js';
import { exhaustive } from '../../exhaustive.js';

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

        if (!result.ok) {
            const errorType = result.error.type;

            switch (errorType) {
                case 'SqliteError':
                    return reply.code(400).send({ error: 'addLimitToPubkey failed (sql)' });
           
           
                case 'ConsistencyError':
                    console.error(result);
                    return reply.code(500).send();

                default:
                    return exhaustive(errorType);
            }
        }

        return reply.code(200).send({
            unspendStorageSize: result.value.unspendStorageSize,
            totalStorageSize: result.value.totalStorageSize,
        });
    });
};
