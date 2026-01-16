import { err, ok } from '@evolu/common';

import {
    Challenge,
    CreateChallengeStorage,
    SessionId,
} from '../../../../storage/challengeStorage/createChallengeStorage.js';
import { GenerateRandomBytesDep } from '../../../GenerateRandomBytes.js';
import { Result } from '../../../types.js';

type ChallengeCreateError = { type: 'DatabaseError' } | { type: 'InvalidChallenge' };

export type ChallengeCreateOperationDeps = {
    challengeStorage: Pick<CreateChallengeStorage, 'storeChallenge' | 'cleanupExpiredChallenges'>;
} & GenerateRandomBytesDep;

export type ChallengeCreateOperationInput = {
    sessionId: SessionId;
};

export type ChallengeCreateOperationOutput = {
    challenge: Challenge;
};

export type ChallengeCreateOperation = (
    input: ChallengeCreateOperationInput,
) => Promise<Result<ChallengeCreateOperationOutput, ChallengeCreateError>>;

export type ChallengeCreateOperationDep = { challengeCreateOperation: ChallengeCreateOperation };

export const createChallengeCreateOperation =
    (deps: ChallengeCreateOperationDeps): ChallengeCreateOperation =>
    async input => {
        const { sessionId } = input;

        const challengeResult = Challenge.from(deps.generateRandomBytes(32));

        if (!challengeResult.ok) {
            return err({ type: 'InvalidChallenge' });
        }

        const challenge = challengeResult.value;

        const storeResult = await deps.challengeStorage.storeChallenge({
            sessionId,
            challenge,
        });

        if (!storeResult.ok) {
            return err({ type: storeResult.error.type });
        }

        // Cleanup expired challenges (the best effort, don't fail if it errors)
        await deps.challengeStorage.cleanupExpiredChallenges();

        return ok({ challenge });
    };
