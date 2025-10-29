import type { LimitStorage } from '../../storage/limitStorage/limitStorage.js';
import type { ServerType } from '../server.js';

const schema = {
    schema: {
        body: {
            type: 'object',
            properties: {
                publicKey: { type: 'string' },
                ownerId: { type: 'string' },
                recipientOwnerId: { type: 'string' },
            },
            required: ['publicKey', 'ownerId'],
        },
    },
} as const;

export type StorageDeleteEndpointDeps = {
    server: ServerType;
    limitStorage: Pick<LimitStorage, 'getLimitForOwner' | 'getLimitForPubkey'>;
};

export const storageDeleteEndpoint = ({ server, limitStorage }: StorageDeleteEndpointDeps) => {
    server.post('/storage/delete', schema, (request, reply) => {
        const { publicKey } = request.body;

        // Todo: not implemented

        // calls deleteOwner(ownerId) at Evolu Relay
        // removes total space for ownerId, syncs with Evolu
        // removes ownerId from the database
        // if publickey/recipientOwnerId is provided, adds total space to recipientOwnerId
        // for publickey, adds unspend space to publickey
        // if none provided, the freed space is lost

        return { publicKey };
    });
};
