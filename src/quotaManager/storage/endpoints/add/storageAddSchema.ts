import { type ObjectType, String, object } from '@evolu/common';

import {
    Challenge,
    SessionId,
} from '../../../../storage/challengeStorage/createChallengeStorage.js';
import { Proof, PublicKey, Size } from '../../../../storage/limitStorage/limitStorage.js';
import { type EvoluRequestSchema } from '../../../evoluValidatorCompiler.js';

const storageAddProps = {
    publicKey: PublicKey,
    ownerId: String,
    size: Size,
    challenge: Challenge,
    sessionId: SessionId,
    proof: Proof,
};

export const storageAddEvoluSchema: ObjectType<typeof storageAddProps> = object(storageAddProps);

export const storageAddRequestSchema: EvoluRequestSchema<typeof storageAddEvoluSchema> = {
    schema: {
        body: {
            evoluSchema: storageAddEvoluSchema,
        },
    },
};
