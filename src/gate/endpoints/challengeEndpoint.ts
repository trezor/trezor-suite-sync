import { object } from '@evolu/common';

import { exhaustive } from '../../exhaustive.js';
import {
    Challenge,
    ChallengeStorage,
    SessionId,
} from '../../storage/challengeStorage/challengeStorage.js';
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

const schemaEvolu = object({
    sessionId: SessionId,
});

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
        const resultEvolu = schemaEvolu.from(request.body);

        if (!resultEvolu.ok) {
            return reply.code(400).send({ error: resultEvolu.error });
        }

        const { sessionId } = resultEvolu.value;

        const challengeResult = Challenge.from(createRandomBytes(32));

        if (!challengeResult.ok) {
            console.error(challengeResult.error);

            return reply.code(500).send();
        }

        const challenge = challengeResult.value;

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
