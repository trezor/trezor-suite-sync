import { String, object } from '@evolu/common';

import { Challenge, SessionId } from '../../../../storage/challengeStorage/createChallengeStorage.js';
import { Proof, PublicKey, Size } from '../../../../storage/limitStorage/limitStorage.js';

export const storageAddEvoluSchema = object({
    publicKey: PublicKey,
    ownerId: String,
    size: Size,
    challenge: Challenge,
    sessionId: SessionId,
    proof: Proof,
});

export const storageAddRequestSchema = {
    schema: {
        body: {
            evoluSchema: storageAddEvoluSchema,
        },
    },
} as const;
