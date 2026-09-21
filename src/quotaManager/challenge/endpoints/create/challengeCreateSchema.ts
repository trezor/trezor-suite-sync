import { type ObjectType, object } from '@evolu/common';

import { SessionId } from '../../../../storage/challengeStorage/createChallengeStorage.js';
import { type EvoluRequestSchema } from '../../../evoluValidatorCompiler.js';

const challengeCreateProps = {
    sessionId: SessionId,
};

export const challengeCreateEvoluSchema: ObjectType<typeof challengeCreateProps> =
    object(challengeCreateProps);

export const challengeCreateRequestSchema: EvoluRequestSchema<typeof challengeCreateEvoluSchema> = {
    schema: {
        body: {
            evoluSchema: challengeCreateEvoluSchema,
        },
    },
};
