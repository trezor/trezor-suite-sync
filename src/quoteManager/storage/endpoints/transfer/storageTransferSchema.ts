import { OwnerId, object } from '@evolu/common';

import {
    Proof,
    PublicKey,
    Size,
    Timestamp,
} from '../../../../storage/limitStorage/limitStorage.js';

export const transferEvoluSchema = object({
    proof: Proof,
    size: Size,
    timestamp: Timestamp,
    publicKey: PublicKey,
    ownerId: OwnerId,
});

export const transferRequestSchema = {
    schema: {
        body: {
            evoluSchema: transferEvoluSchema,
        },
    },
} as const;
