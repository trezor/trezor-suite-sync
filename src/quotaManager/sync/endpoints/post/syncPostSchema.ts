import { OwnerId, object } from '@evolu/common';

export const syncPostEvoluSchema = object({
    ownerId: OwnerId,
});

export type SyncPostRequestQuery = {
    ownerId: OwnerId;
};

export const syncPostRequestSchema = {
    schema: {
        body: {
            evoluSchema: syncPostEvoluSchema,
        },
    },
} as const;
