import { object } from '@evolu/common';

import {
    Proof,
    PublicKey,
    Size,
    Timestamp,
} from '../../../../storage/limitStorage/limitStorage.js';

export const storageRegisterEvoluSchema = object({
    publicKey: PublicKey,
    size: Size,
    proof: Proof,
    timestamp: Timestamp,
});

export const storageRegisterRequestSchema = {
    schema: {
        body: {
            evoluSchema: storageRegisterEvoluSchema,
        },
    },
} as const;
