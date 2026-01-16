import { err, ok } from '@evolu/common';

import {
    Challenge,
    SessionId,
} from '../../../../storage/challengeStorage/createChallengeStorage.js';
import { CleanupExpiredChallengesDep } from '../../../../storage/challengeStorage/methods/createCleanupExpiredChallenges.js';
import { StoreChallengeDep } from '../../../../storage/challengeStorage/methods/createStoreChallenge.js';
import { GenerateRandomBytesDep } from '../../../GenerateRandomBytes.js';
import { Result } from '../../../types.js';

type ChallengeCreateError = { type: 'DatabaseError' } | { type: 'InvalidChallenge' };

export type ChallengeCreateOperationDeps = StoreChallengeDep &
    CleanupExpiredChallengesDep &
    GenerateRandomBytesDep;

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

        const storeResult = await deps.storeChallenge({
            sessionId,
            challenge,
        });

        if (!storeResult.ok) {
            return err({ type: storeResult.error.type });
        }

        // Cleanup expired challenges (the best effort, don't fail if it errors)
        await deps.cleanupExpiredChallenges();

        return ok({ challenge });
    };
