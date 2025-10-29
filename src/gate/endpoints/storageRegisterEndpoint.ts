import { object } from '@evolu/common';

import { exhaustive } from '../../exhaustive.js';
import {
    LimitStorage,
    Proof,
    PublicKey,
    Size,
    Timestamp,
} from '../../storage/limitStorage/limitStorage.js';
import { ServerType } from '../server.js';

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

const schemaEvolu = object({
    publicKey: PublicKey,
    size: Size,
    proof: Proof,
    timestamp: Timestamp,
});

export type StorageRegisterEndpointDeps = {
    server: ServerType;
    limitStorage: Pick<LimitStorage, 'addLimitToPubkey'>;
};

export const storageRegisterEndpoint = ({ server, limitStorage }: StorageRegisterEndpointDeps) => {
    server.post('/storage/register', schema, (request, reply) => {
        const resultEvolu = schemaEvolu.from(request.body);

        if (!resultEvolu.ok) {
            return reply.code(400).send({ error: resultEvolu.error });
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { proof, size, timestamp, publicKey } = resultEvolu.value;

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
