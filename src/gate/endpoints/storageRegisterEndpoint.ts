import { exhaustive } from '../../exhaustive.js';
import { ServerType } from '../server.js';
import { LimitStorage } from '../../storage/limitStorage/limitStorage.js';

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

export type StorageRegisterEndpointDeps = {
    server: ServerType;
    limitStorage: Pick<LimitStorage, 'addLimitToPubkey'>;
};

export const storageRegisterEndpoint = ({ server, limitStorage }: StorageRegisterEndpointDeps) => {
    server.post('/storage/register', schema, (request, reply) => {
        const { proof, size, timestamp, publicKey } = request.body;

        // Proof verification - validation of the Trezor signature
        // Timestamp validation - replay attack protection
        // Space limit validation - check against device storage limits
        // Device ID tracking - mechanism to prevent multiple requests per device per second ???? maybe here

        const result = limitStorage.addLimitToPubkey({ publicKey, size });

        if (!result.ok) {
            const errorType = result.error.type;

            switch (errorType) {
                case 'SqliteError':
                case 'ConsistencyError':
                    console.error(result);
                    return reply.code(500).send();

                default:
                    exhaustive(errorType);
            }

            return reply.code(400).send({ error: 'addLimitToPubkey failed (sql)' });
        }

        return reply.code(200).send({
            unspendStorageSize: result.value.unspendStorageSize,
            totalStorageSize: result.value.totalStorageSize,
        });
    });
};
