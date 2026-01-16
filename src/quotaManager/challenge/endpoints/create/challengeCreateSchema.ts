import { object } from '@evolu/common';

import { SessionId } from '../../../../storage/challengeStorage/createChallengeStorage.js';

export const challengeCreateEvoluSchema = object({
    sessionId: SessionId,
});

export const challengeCreateRequestSchema = {
    schema: {
        body: {
            evoluSchema: challengeCreateEvoluSchema,
        },
    },
} as const;
