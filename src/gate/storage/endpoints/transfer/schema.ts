import { OwnerId, object } from '@evolu/common';

import {
    Proof,
    PublicKey,
    Size,
    Timestamp,
} from '../../../../storage/limitStorage/limitStorage.js';

export const transferRequestSchema = {
    schema: {
        body: {
            type: 'object',
            properties: {
                publicKey: { type: 'string' }, // donor
                ownerId: { type: 'string' }, // recipient
                size: { type: 'number' },
                proof: { type: 'string' },
                timestamp: { type: 'number' },
            },
            required: ['publicKey', 'ownerId', 'size', 'proof', 'timestamp'],
        },
    },
} as const;

export const transferEvoluSchema = object({
    proof: Proof,
    size: Size,
    timestamp: Timestamp,
    publicKey: PublicKey,
    ownerId: OwnerId,
});

export type TransferRequestBody = {
    proof: Proof;
    size: Size;
    timestamp: Timestamp;
    publicKey: PublicKey;
    ownerId: OwnerId;
};
