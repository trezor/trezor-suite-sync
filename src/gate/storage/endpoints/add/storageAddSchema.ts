import { String, object } from '@evolu/common';

import { Challenge, SessionId } from '../../../../storage/challengeStorage/challengeStorage.js';
import { Proof, PublicKey, Size } from '../../../../storage/limitStorage/limitStorage.js';

export const storageAddRequestSchema = {
    schema: {
        body: {
            type: 'object',
            properties: {
                publicKey: { type: 'string' },
                ownerId: { type: 'string' },
                size: { type: 'number' },
                challenge: { type: 'string' },
                sessionId: { type: 'string' },
                proof: { type: 'string' },
            },
            required: ['publicKey', 'ownerId', 'size', 'challenge', 'sessionId', 'proof'],
        },
    },
} as const;

export const storageAddEvoluSchema = object({
    publicKey: PublicKey,
    ownerId: String,
    size: Size,
    challenge: Challenge,
    sessionId: SessionId,
    proof: Proof,
});
