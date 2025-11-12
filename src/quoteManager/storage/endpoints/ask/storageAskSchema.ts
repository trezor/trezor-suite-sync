import { OwnerId, object, optional } from '@evolu/common';

import { PublicKey } from '../../../../storage/limitStorage/limitStorage.js';

export const askEvoluSchema = object({
    publicKey: optional(PublicKey),
    ownerId: optional(OwnerId),
});

export const storageAskRequestSchema = {
    schema: {
        querystring: {
            evoluSchema: askEvoluSchema,
        },
    },
} as const;
