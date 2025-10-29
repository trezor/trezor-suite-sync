import { exhaustive } from '../../exhaustive.js';
import type { ChallengeStorage } from '../../storage/challengeStorage/challengeStorage.js';
import type { ServerType } from '../server.js';

const schema = {
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

export type ChallengeEndpointDeps = {
    server: ServerType;
    challengeStorage: ChallengeStorage;
    createRandomBytes: (size: number) => string;
};

export const challengeEndpoint = ({
    server,
    challengeStorage,
    createRandomBytes,
}: ChallengeEndpointDeps) => {
    server.post('/challenge', schema, (request, reply) => {
        const { sessionId } = request.body;

        const challenge = createRandomBytes(32);

        const result = challengeStorage.storeChallenge(sessionId, challenge);

        if (!result.ok) {
            const errorType = result.error.type;

            switch (errorType) {
                case 'SqliteError':
                    console.error(result);

                    return reply.code(500).send();

                default:
                    return exhaustive(errorType);
            }
        }

        challengeStorage.cleanupExpiredChallenges();

        return reply.code(200).send({ challenge });
    });
};
