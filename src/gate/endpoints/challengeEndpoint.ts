import { randomBytes } from 'crypto';
import type { ServerType } from '../server.js';
import { exhaustive } from '../../exhaustive.js';
import type { ChallengeStorage } from '../../storage/challengeStorage/challengeStorage.js';

const schema = {
    schema: {
        body: {
            type: 'object',
            properties: {
                sessionId: { type: 'string' },
            },
            required: ['sessionId'],
        },
    },
} as const;

export type ChallengeEndpointDeps = {
    server: ServerType;
    challengeStorage: ChallengeStorage;
};

export const challengeEndpoint = ({ server, challengeStorage }: ChallengeEndpointDeps) => {
    server.post('/challenge', schema, (request, reply) => {
        const { sessionId } = request.body;

        const challenge = randomBytes(32).toString('hex');

        const result = challengeStorage.storeChallenge(sessionId, challenge);

        if (!result.ok) {
            const errorType = result.error.type;

            switch (errorType) {
                case 'SqliteError':
                    console.error(result);
                    return reply.code(500).send();

                default:
                    exhaustive(errorType);
            }
        }

        challengeStorage.cleanupExpiredChallenges();

        return reply.code(200).send({ challenge });
    });
};
