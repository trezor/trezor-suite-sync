import { String, object } from '@evolu/common';

import { Challenge, SessionId } from '../../../../storage/challengeStorage/challengeStorage.js';
import { Proof, PublicKey, Size } from '../../../../storage/limitStorage/limitStorage.js';

export const storageRegisterEvoluSchema = object({
    publicKey: PublicKey,
    size: Size,
    challenge: Challenge,
    proof: Proof,
    certificateChain: object({
        deviceCert: String,
        caCert: String,
    }),
    deviceModel: String,
    sessionId: SessionId,
});

export const storageRegisterRequestSchema = {
    schema: {
        body: {
            evoluSchema: storageRegisterEvoluSchema,
        },
    },
} as const;
