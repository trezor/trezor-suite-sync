import { Challenge } from '../../../../storage/challengeStorage/challengeStorage.js';

export type ChallengeCreateResponse = {
    challenge: Challenge;
};

/**
 * Serializes the create challenge operation result into HTTP response format.
 */
export const serializeChallengeCreateResponse = (data: {
    challenge: Challenge;
}): ChallengeCreateResponse => ({
    challenge: data.challenge,
});
