import { object } from '@evolu/common';

import { SessionId } from '../../../../storage/challengeStorage/challengeStorage.js';

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
