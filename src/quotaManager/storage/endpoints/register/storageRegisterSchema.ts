import { type ObjectType, String, object, optional } from '@evolu/common';

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
import { type EvoluRequestSchema } from '../../../evoluValidatorCompiler.js';

const certificateChainProps = {
    deviceCert: String,
    caCert: String,
};

const storageRegisterProps = {
    publicKey: PublicKey,
    size: Size,
    challenge: Challenge,
    proof: Proof,
    certificateChain: object(certificateChainProps) as ObjectType<typeof certificateChainProps>,
    deviceModel: String,
    sessionId: SessionId,
    rotationIndex: optional(RotationIndex),
};

export const storageRegisterEvoluSchema: ObjectType<typeof storageRegisterProps> =
    object(storageRegisterProps);

export const storageRegisterRequestSchema: EvoluRequestSchema<typeof storageRegisterEvoluSchema> = {
    schema: {
        body: {
            evoluSchema: storageRegisterEvoluSchema,
        },
    },
};
