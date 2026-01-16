import { assert, describe, expect, it } from 'vitest';

import { createDeleteChallenge } from './createDeleteChallenge.js';
import { createStoreChallenge } from './createStoreChallenge.js';
import { createValidateAndConsumeChallenge } from './createValidateAndConsumeChallenge.js';
import { CreateTimeDep } from '../../../CreateTime.js';
import { getOrThrowTest } from '../../../getOrThrowTest.js';
import { createTestDatabase } from '../../posgres/createTestDatabase.js';
import { Challenge, SessionId } from '../createChallengeStorage.js';

const session123 = getOrThrowTest(SessionId.from('session-123'));
const sessionNonExistent = getOrThrowTest(SessionId.from('session-non-existent'));
const challengeABC = getOrThrowTest(Challenge.from('challenge-abc'));
const challengeWrong = getOrThrowTest(Challenge.from('challenge-wrong'));

const createTestServices = async (deps: Partial<CreateTimeDep> = {}) => {
    const db = await createTestDatabase();
    const storeChallenge = createStoreChallenge({
        db,
        createTime: deps.createTime ?? (() => Date.now()),
    });
    const deleteChallenge = createDeleteChallenge({ db });
    const validateAndConsumeChallenge = createValidateAndConsumeChallenge({
        db,
        createTime: () => Date.now(),
        deleteChallenge,
    });

    return {
        db,
        storeChallenge,
        validateAndConsumeChallenge,
        deleteChallenge,
    };
};

describe(createValidateAndConsumeChallenge.name, () => {
    it('validates correct challenge', async () => {
        const { storeChallenge, validateAndConsumeChallenge } = await createTestServices();

        await storeChallenge({ sessionId: session123, challenge: challengeABC });

        const result = await validateAndConsumeChallenge({
            sessionId: session123,
            challenge: challengeABC,
        });
        assert(result.ok);
        expect(result.value).toBe(true);
    });

    it('returns false for non-existent sessionId', async () => {
        const { validateAndConsumeChallenge } = await createTestServices();

        const result = await validateAndConsumeChallenge({
            sessionId: sessionNonExistent,
            challenge: challengeABC,
        });
        assert(result.ok);
        expect(result.value).toBe(false);
    });

    it('returns false for wrong challenge', async () => {
        const { storeChallenge, validateAndConsumeChallenge } = await createTestServices();

        await storeChallenge({ sessionId: session123, challenge: challengeABC });

        const result = await validateAndConsumeChallenge({
            sessionId: session123,
            challenge: challengeWrong,
        });
        assert(result.ok);
        expect(result.value).toBe(false);
    });

    it('consumes challenge after validation', async () => {
        const { storeChallenge, validateAndConsumeChallenge } = await createTestServices();

        await storeChallenge({ sessionId: session123, challenge: challengeABC });

        const result1 = await validateAndConsumeChallenge({
            sessionId: session123,
            challenge: challengeABC,
        });
        assert(result1.ok);
        expect(result1.value).toBe(true);

        const result2 = await validateAndConsumeChallenge({
            sessionId: session123,
            challenge: challengeABC,
        });
        assert(result2.ok);
        expect(result2.value).toBe(false);
    });

    it('returns false for expired challenge', async () => {
        let currentTime = 1000;
        const { validateAndConsumeChallenge } = await createTestServices({
            createTime: () => currentTime,
        });

        currentTime = 1000 + 31 * 1000;

        const result = await validateAndConsumeChallenge({
            sessionId: session123,
            challenge: challengeABC,
        });
        assert(result.ok);
        expect(result.value).toBe(false);
    });
});
