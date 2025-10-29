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
        return {
            ok: false,
            error: { type: 'InvalidChallenge' },
        };
    }

    const challenge = challengeResult.value;

    const storeResult = deps.challengeStorage.storeChallenge(sessionId, challenge);

    if (!storeResult.ok) {
        return {
            ok: false,
            error: { type: storeResult.error.type },
        };
    }

    // Cleanup expired challenges (best effort, don't fail if this errors)
    deps.challengeStorage.cleanupExpiredChallenges();

    return {
        ok: true,
        value: { challenge },
    };
};
