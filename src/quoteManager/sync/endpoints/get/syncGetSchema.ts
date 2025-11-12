import { OwnerId, object } from '@evolu/common';

export const syncGetEvoluSchema = object({
    ownerId: OwnerId,
});

export type SyncGetRequestQuery = {
    ownerId: OwnerId;
};

export const syncGetRequestSchema = {
    schema: {
        querystring: {
            evoluSchema: syncGetEvoluSchema,
        },
    },
} as const;
