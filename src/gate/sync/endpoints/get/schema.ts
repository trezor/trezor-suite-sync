import { OwnerId, object } from '@evolu/common';

export const syncGetRequestSchema = {
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

export const syncGetEvoluSchema = object({
    ownerId: OwnerId,
});

export type SyncGetRequestQuery = {
    ownerId: OwnerId;
};
