import { LimitStorage } from '../../storage/limitStorage/limitStorage.js';
import type { ServerType } from '../server.js';

const schema = {
    schema: {
        querystring: {
            type: 'object',
            properties: {
                ownerId: { type: 'string' },
            },
            required: ['ownerId'],
        },
    },
} as const;

export type StorageSyncEndpointDeps = {
    server: ServerType;
    limitStorage: Pick<LimitStorage, 'getLimitForOwner'>;
};

export const syncEndpoint = ({ server }: StorageSyncEndpointDeps) => {
    server.get('/sync', schema, (request, reply) => {
        const { ownerId } = request.query;

        // Todo: implement

        return { ownerId };
    });
};
