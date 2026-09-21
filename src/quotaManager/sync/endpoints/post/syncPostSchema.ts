import { type ObjectType, OwnerId, object } from '@evolu/common';

import { type EvoluRequestSchema } from '../../../evoluValidatorCompiler.js';

const syncPostProps = {
    ownerId: OwnerId,
};

export const syncPostEvoluSchema: ObjectType<typeof syncPostProps> = object(syncPostProps);

export type SyncPostRequestQuery = {
    ownerId: OwnerId;
};

export const syncPostRequestSchema: EvoluRequestSchema<typeof syncPostEvoluSchema> = {
    schema: {
        body: {
            evoluSchema: syncPostEvoluSchema,
        },
    },
};
