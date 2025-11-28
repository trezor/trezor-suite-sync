import { assert, beforeEach, describe, expect, it } from 'vitest';

import {
    Challenge,
    ChallengeStorage,
    SessionId,
    createChallengeStorage,
} from './challengeStorage.js';
import { getOrThrowTest } from '../../getOrThrowTest.js';
import { prepareSqlite } from '../prepareSqlite.js';

const session123 = getOrThrowTest(SessionId.from('session-123'));
const sessionNonExistent = getOrThrowTest(SessionId.from('session-non-existent'));

const challengeABC = getOrThrowTest(Challenge.from('challenge-abc'));
const challengeNew = getOrThrowTest(Challenge.from('challenge-old'));
const challengeOld = getOrThrowTest(Challenge.from('challenge-new'));
const challengeWrong = getOrThrowTest(Challenge.from('challenge-wrong'));

describe('challengeStorage', () => {
    let challengeStorage: ChallengeStorage;

    beforeEach(async () => {
        const sqlite = await prepareSqlite({ inMemory: true });
        assert(sqlite.ok);

        const challengeStorageResult = createChallengeStorage({ sqlite: sqlite.value });
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

    it('replaces existing challenge for same sessionId', () => {
        challengeStorage.storeChallenge(session123, challengeOld);
        challengeStorage.storeChallenge(session123, challengeNew);

        const isOldValid = challengeStorage.validateAndConsumeChallenge(session123, challengeOld);
        assert(isOldValid.ok);
        expect(isOldValid.value).toBe(false);

        const isNewValid = challengeStorage.validateAndConsumeChallenge(session123, challengeNew);
        assert(isNewValid.ok);
        expect(isNewValid.value).toBe(true);
    });

    it('validates correct challenge', () => {
        challengeStorage.storeChallenge(session123, challengeABC);

        const isValid = challengeStorage.validateAndConsumeChallenge(session123, challengeABC);
        assert(isValid.ok);
        expect(isValid.value).toBe(true);
    });

    it('returns false for non-existent sessionId', () => {
        const isValid = challengeStorage.validateAndConsumeChallenge(
            sessionNonExistent,
            challengeABC,
        );
        assert(isValid.ok);
        expect(isValid.value).toBe(false);
    });

    it('returns false for wrong challenge', () => {
        challengeStorage.storeChallenge(session123, challengeABC);

        const isValid = challengeStorage.validateAndConsumeChallenge(session123, challengeWrong);
        assert(isValid.ok);
        expect(isValid.value).toBe(false);
    });

    it('consumes challenge after validation', () => {
        challengeStorage.storeChallenge(session123, challengeABC);

        const isValid1 = challengeStorage.validateAndConsumeChallenge(session123, challengeABC);
        assert(isValid1.ok);
        expect(isValid1.value).toBe(true);

        const isValid2 = challengeStorage.validateAndConsumeChallenge(session123, challengeABC);
        assert(isValid2.ok);
        expect(isValid2.value).toBe(false);
    });

    it('returns false for expired challenge', async () => {
        let currentTime = 1000;
        const sqlite = await prepareSqlite({ inMemory: true });
        assert(sqlite.ok);

        const storageWithTimeResult = createChallengeStorage({
            sqlite: sqlite.value,
            createTime: () => currentTime,
        });
        assert(storageWithTimeResult.ok);
        const storageWithTime = storageWithTimeResult.value;

        storageWithTime.storeChallenge(session123, challengeABC, 30 * 1000);

        currentTime = 1000 + 31 * 1000;

        const isValid = storageWithTime.validateAndConsumeChallenge(session123, challengeABC);
        assert(isValid.ok);
        expect(isValid.value).toBe(false);
    });
});
