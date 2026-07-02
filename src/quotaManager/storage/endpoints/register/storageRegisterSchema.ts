import { String, object, optional } from '@evolu/common';

import {
    Challenge,
    SessionId,
} from '../../../../storage/challengeStorage/createChallengeStorage.js';
import {
    Proof,
    PublicKey,
    RotationIndex,
    Size,
} from '../../../../storage/limitStorage/limitStorage.js';

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
    rotationIndex: optional(RotationIndex),
});

export const storageRegisterRequestSchema = {
    schema: {
        body: {
            evoluSchema: storageRegisterEvoluSchema,
        },
    },
} as const;
