import { object } from '@evolu/common';

import { SessionId } from '../../../../storage/challengeStorage/challengeStorage.js';

export const challengeCreateRequestSchema = {
    schema: {
        body: {
            type: 'object',
            properties: {
                sessionId: {
                    type: 'string',
                    minLength: 32,
                    maxLength: 32,
                    pattern: '^[a-zA-Z0-9]{32}$',
                },
            },
            required: ['sessionId'],
        },
    },
} as const;

export const challengeCreateEvoluSchema = object({
    sessionId: SessionId,
});

export type ChallengeCreateRequestBody = {
    sessionId: SessionId;
};
