import { object } from '@evolu/common';

import {
    Proof,
    PublicKey,
    Size,
    Timestamp,
} from '../../../../storage/limitStorage/limitStorage.js';

export const registerRequestSchema = {
    schema: {
        body: {
            type: 'object',
            properties: {
                publicKey: { type: 'string' },
                size: { type: 'number' },
                proof: { type: 'string' },
                timestamp: { type: 'number' },
            },
            required: ['publicKey', 'size', 'proof', 'timestamp'],
        },
    },
} as const;

export const registerEvoluSchema = object({
    publicKey: PublicKey,
    size: Size,
    proof: Proof,
    timestamp: Timestamp,
});

export type RegisterRequestBody = {
    publicKey: PublicKey;
    size: Size;
    proof: Proof;
    timestamp: Timestamp;
};
