import { assert, beforeEach, describe, expect, it } from 'vitest';

import {
    Challenge,
    ChallengeStorage,
    SessionId,
    createChallengeStorage,
} from './challengeStorage.js';
import { getOrThrowTest } from '../../getOrThrowTest.js';
import { prepareTestDatabase } from '../limitStorage/prepareTestDatabase.js';

const session123 = getOrThrowTest(SessionId.from('session-123'));
const sessionNonExistent = getOrThrowTest(SessionId.from('session-non-existent'));

const challengeABC = getOrThrowTest(Challenge.from('challenge-abc'));
const challengeNew = getOrThrowTest(Challenge.from('challenge-old'));
const challengeOld = getOrThrowTest(Challenge.from('challenge-new'));
const challengeWrong = getOrThrowTest(Challenge.from('challenge-wrong'));

describe('challengeStorage', () => {
    let challengeStorage: ChallengeStorage;

    beforeEach(async () => {
        const db = prepareTestDatabase();

        const challengeStorageResult = await createChallengeStorage({ db });
        assert(challengeStorageResult.ok);
        challengeStorage = challengeStorageResult.value;
    });

    it('stores challenge successfully', async () => {
        const result = await challengeStorage.storeChallenge(session123, challengeABC);
        expect(result.ok).toBe(true);

        const isValid = await challengeStorage.validateAndConsumeChallenge(
            session123,
            challengeABC,
        );
        assert(isValid.ok);
        expect(isValid.value).toBe(true);
    });

    it('replaces existing challenge for same sessionId', async () => {
        await challengeStorage.storeChallenge(session123, challengeOld);
        await challengeStorage.storeChallenge(session123, challengeNew);

        const isOldValid = await challengeStorage.validateAndConsumeChallenge(
            session123,
            challengeOld,
        );
        assert(isOldValid.ok);
        expect(isOldValid.value).toBe(false);

        const isNewValid = await challengeStorage.validateAndConsumeChallenge(
            session123,
            challengeNew,
        );
        assert(isNewValid.ok);
        expect(isNewValid.value).toBe(true);
    });

    it('validates correct challenge', async () => {
        await challengeStorage.storeChallenge(session123, challengeABC);

        const isValid = await challengeStorage.validateAndConsumeChallenge(
            session123,
            challengeABC,
        );
        assert(isValid.ok);
        expect(isValid.value).toBe(true);
    });

    it('returns false for non-existent sessionId', async () => {
        const isValid = await challengeStorage.validateAndConsumeChallenge(
            sessionNonExistent,
            challengeABC,
        );
        assert(isValid.ok);
        expect(isValid.value).toBe(false);
    });

    it('returns false for wrong challenge', async () => {
        await challengeStorage.storeChallenge(session123, challengeABC);

        const isValid = await challengeStorage.validateAndConsumeChallenge(
            session123,
            challengeWrong,
        );
        assert(isValid.ok);
        expect(isValid.value).toBe(false);
    });

    it('consumes challenge after validation', async () => {
        await challengeStorage.storeChallenge(session123, challengeABC);

        const isValid1 = await challengeStorage.validateAndConsumeChallenge(
            session123,
            challengeABC,
        );
        assert(isValid1.ok);
        expect(isValid1.value).toBe(true);

        const isValid2 = await challengeStorage.validateAndConsumeChallenge(
            session123,
            challengeABC,
        );
        assert(isValid2.ok);
        expect(isValid2.value).toBe(false);
    });

    it('returns false for expired challenge', async () => {
        let currentTime = 1000;
        const db = prepareTestDatabase();

        const storageWithTimeResult = await createChallengeStorage({
            db,
            createTime: () => currentTime,
        });
        assert(storageWithTimeResult.ok);
        const storageWithTime = storageWithTimeResult.value;

        storageWithTime.storeChallenge(session123, challengeABC, 30 * 1000);

        currentTime = 1000 + 31 * 1000;

        const isValid = await storageWithTime.validateAndConsumeChallenge(session123, challengeABC);
        assert(isValid.ok);
        expect(isValid.value).toBe(false);
    });
});
