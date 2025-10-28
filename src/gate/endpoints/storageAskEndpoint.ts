import { OwnerId, object, optional } from '@evolu/common';

import { exhaustive } from '../../exhaustive.js';
import { LimitStorage, PublicKey } from '../../storage/limitStorage/limitStorage.js';
import type { ServerType } from '../server.js';

const schema = {
    schema: {
        querystring: {
            type: 'object',
            properties: {
                ownerId: { type: 'string' },
                publicKey: { type: 'string' },
            },
            // At least one must be provided
            anyOf: [{ required: ['ownerId'] }, { required: ['publicKey'] }],
        },
    },
} as const;

const schemaEvolu = object({
    publicKey: optional(PublicKey),
    ownerId: optional(OwnerId),
});

export type StorageAskEndpointDeps = {
    server: ServerType;
    limitStorage: Pick<LimitStorage, 'getLimitForOwner' | 'getLimitForPubkey'>;
};

export const storageAskEndpoint = ({ server, limitStorage }: StorageAskEndpointDeps) => {
    server.get('/storage/ask', schema, (request, reply) => {
        const resultEvolu = schemaEvolu.from(request.query);

        if (!resultEvolu.ok) {
            return reply.code(400).send({ error: resultEvolu.error });
        }

        const { ownerId, publicKey } = resultEvolu.value;

        if (ownerId !== undefined) {
            const result = limitStorage.getLimitForOwner({ ownerId });

            if (!result.ok) {
                const errorType = result.error.type;

                switch (errorType) {
                    case 'SqliteError':
                        console.error(result);

                        return reply.code(500).send({ error: 'Internal server error' });
                    default:
                        return exhaustive(errorType);
                }
            }

            if (result.value === null) {
                return reply.code(404).send({ error: 'Owner not found' });
            }

            return reply.code(200).send({ totalSpace: result.value });
        }

        if (publicKey !== undefined) {
            const result = limitStorage.getLimitForPubkey({ publicKey });

            if (!result.ok) {
                const errorType = result.error.type;

                switch (errorType) {
                    case 'SqliteError':
                        console.error(result);

                        return reply.code(500).send({ error: 'Internal server error' });
                    default:
                        return exhaustive(errorType);
                }
            }

            if (result.value === null) {
                return reply.code(404).send({ error: 'Public key not found' });
            }

            return reply.code(200).send({
                totalSpace: result.value.totalStorageSize,
                unspentSpace: result.value.unspendStorageSize,
            });
        }
    });
};
