import { assert, describe, expect, it } from 'vitest';

import { Challenge, createChallengeStorage, SessionId } from './createChallengeStorage.js';
import { getOrThrowTest } from '../../getOrThrowTest.js';
import { createTestDatabase } from '../posgres/createTestDatabase.js';

const session123 = getOrThrowTest(SessionId.from('session-123'));
const sessionNonExistent = getOrThrowTest(SessionId.from('session-non-existent'));

const challengeABC = getOrThrowTest(Challenge.from('challenge-abc'));
const challengeNew = getOrThrowTest(Challenge.from('challenge-old'));
const challengeOld = getOrThrowTest(Challenge.from('challenge-new'));
const challengeWrong = getOrThrowTest(Challenge.from('challenge-wrong'));

const prepareChallengeStorage = async (
    deps: Pick<Partial<Parameters<typeof createChallengeStorage>[0]>, 'createTime'> = {},
) => {
    const db = await createTestDatabase();

    return createChallengeStorage({
        createTime: () => Date.now(),
        db,
        ...deps,
    });
};

describe(createChallengeStorage.name, () => {
    it('stores challenge successfully', async () => {
        const challengeStorage = await prepareChallengeStorage();
        const result = await challengeStorage.storeChallenge({
            sessionId: session123,
            challenge: challengeABC,
        });
        expect(result.ok).toBe(true);

        const isValid = await challengeStorage.validateAndConsumeChallenge({
            sessionId: session123,
            challenge: challengeABC,
        });
        assert(isValid.ok);
        expect(isValid.value).toBe(true);
    });

    it('replaces existing challenge for same sessionId', async () => {
        const challengeStorage = await prepareChallengeStorage();
        await challengeStorage.storeChallenge({
            sessionId: session123,
            challenge: challengeOld,
        });
        await challengeStorage.storeChallenge({
            sessionId: session123,
            challenge: challengeNew,
        });

        const isOldValid = await challengeStorage.validateAndConsumeChallenge({
            sessionId: session123,
            challenge: challengeOld,
        });
        assert(isOldValid.ok);
        expect(isOldValid.value).toBe(false);

        const isNewValid = await challengeStorage.validateAndConsumeChallenge({
            sessionId: session123,
            challenge: challengeNew,
        });
        assert(isNewValid.ok);
        expect(isNewValid.value).toBe(true);
    });

    it('validates correct challenge', async () => {
        const challengeStorage = await prepareChallengeStorage();
        await challengeStorage.storeChallenge({
            sessionId: session123,
            challenge: challengeABC,
        });

        const isValid = await challengeStorage.validateAndConsumeChallenge({
            sessionId: session123,
            challenge: challengeABC,
        });
        assert(isValid.ok);
        expect(isValid.value).toBe(true);
    });

    it('returns false for non-existent sessionId', async () => {
        const challengeStorage = await prepareChallengeStorage();
        const isValid = await challengeStorage.validateAndConsumeChallenge({
            sessionId: sessionNonExistent,
            challenge: challengeABC,
        });
        assert(isValid.ok);
        expect(isValid.value).toBe(false);
    });

    it('returns false for wrong challenge', async () => {
        const challengeStorage = await prepareChallengeStorage();
        await challengeStorage.storeChallenge({
            sessionId: session123,
            challenge: challengeABC,
        });

        const isValid = await challengeStorage.validateAndConsumeChallenge({
            sessionId: session123,
            challenge: challengeWrong,
        });
        assert(isValid.ok);
        expect(isValid.value).toBe(false);
    });

    it('consumes challenge after validation', async () => {
        const challengeStorage = await prepareChallengeStorage();
        await challengeStorage.storeChallenge({
            sessionId: session123,
            challenge: challengeABC,
        });

        const isValid1 = await challengeStorage.validateAndConsumeChallenge({
            sessionId: session123,
            challenge: challengeABC,
        });
        assert(isValid1.ok);
        expect(isValid1.value).toBe(true);

        const isValid2 = await challengeStorage.validateAndConsumeChallenge({
            sessionId: session123,
            challenge: challengeABC,
        });
        assert(isValid2.ok);
        expect(isValid2.value).toBe(false);
    });

    it('returns false for expired challenge', async () => {
        let currentTime = 1000;

        const challengeStorage = await prepareChallengeStorage({ createTime: () => currentTime });
        await challengeStorage.storeChallenge({
            sessionId: session123,
            challenge: challengeABC,
            expiresInSeconds: 30 * 1000,
        });

        currentTime = 1000 + 31 * 1000;

        const isValid = await challengeStorage.validateAndConsumeChallenge({
            sessionId: session123,
            challenge: challengeABC,
        });
        assert(isValid.ok);
        expect(isValid.value).toBe(false);
    });
});
