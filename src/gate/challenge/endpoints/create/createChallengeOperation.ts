import { err, ok } from '@evolu/common';

import {
    Challenge,
    ChallengeStorage,
    SessionId,
} from '../../../../storage/challengeStorage/challengeStorage.js';
import { Result } from '../../../types.js';

type ChallengeCreateError = { type: 'SqliteError' } | { type: 'InvalidChallenge' };

export type ChallengeCreateOperationDeps = {
    challengeStorage: Pick<ChallengeStorage, 'storeChallenge' | 'cleanupExpiredChallenges'>;
    createRandomBytes: (size: number) => string;
};

export type ChallengeCreateOperationInput = {
    sessionId: SessionId;
};

export type ChallengeCreateOperationOutput = {
    challenge: Challenge;
};

export const createChallengeOperation = (
    deps: ChallengeCreateOperationDeps,
    input: ChallengeCreateOperationInput,
): Result<ChallengeCreateOperationOutput, ChallengeCreateError> => {
    const { sessionId } = input;

    const challengeResult = Challenge.from(deps.createRandomBytes(32));

    if (!challengeResult.ok) {
        return err({ type: 'InvalidChallenge' });
    }

    const challenge = challengeResult.value;

    const storeResult = deps.challengeStorage.storeChallenge(sessionId, challenge);

    if (!storeResult.ok) {
        return err({ type: storeResult.error.type });
    }

    // Cleanup expired challenges (the best effort, don't fail if it errors)
    deps.challengeStorage.cleanupExpiredChallenges();

    return ok({ challenge });
};
