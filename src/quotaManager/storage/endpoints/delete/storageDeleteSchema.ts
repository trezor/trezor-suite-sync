import { OwnerId, object } from '@evolu/common';

import {
    Proof,
    PublicKey,
    Size,
    Timestamp,
} from '../../../../storage/limitStorage/limitStorage.js';

export const deleteEvoluSchema = object({
    proof: Proof,
    size: Size,
    timestamp: Timestamp,
    publicKey: PublicKey,
    ownerId: OwnerId,
});

export const deleteRequestSchema = {
    schema: {
        body: {
            evoluSchema: deleteEvoluSchema,
        },
    },
} as const;
