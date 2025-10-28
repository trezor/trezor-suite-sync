import { describe, expect, it, beforeEach, assert } from 'vitest';
import { ChallengeStorage, createChallengeStorage } from './challengeStorage.js';
import { prepareSqlite } from '../prepareSqlite.js';

describe('challengeStorage', () => {
    let challengeStorage: ChallengeStorage;

    beforeEach(async () => {
        const sqlite = await prepareSqlite({ inMemory: true });
        assert(sqlite.ok);

        const challengeStorageResult = createChallengeStorage({ sqlite: sqlite.value });
        assert(challengeStorageResult.ok);
        challengeStorage = challengeStorageResult.value;
    });

    it('stores challenge successfully', () => {
        const result = challengeStorage.storeChallenge('session-123', 'challenge-abc');
        expect(result.ok).toBe(true);

        const isValid = challengeStorage.validateAndConsumeChallenge(
            'session-123',
            'challenge-abc',
        );
        assert(isValid.ok);
        expect(isValid.value).toBe(true);
    });

    it('replaces existing challenge for same sessionId', () => {
        challengeStorage.storeChallenge('session-123', 'challenge-old');
        challengeStorage.storeChallenge('session-123', 'challenge-new');

        const isOldValid = challengeStorage.validateAndConsumeChallenge(
            'session-123',
            'challenge-old',
        );
        assert(isOldValid.ok);
        expect(isOldValid.value).toBe(false);

        const isNewValid = challengeStorage.validateAndConsumeChallenge(
            'session-123',
            'challenge-new',
        );
        assert(isNewValid.ok);
        expect(isNewValid.value).toBe(true);
    });

    it('validates correct challenge', () => {
        challengeStorage.storeChallenge('session-123', 'challenge-abc');

        const isValid = challengeStorage.validateAndConsumeChallenge(
            'session-123',
            'challenge-abc',
        );
        assert(isValid.ok);
        expect(isValid.value).toBe(true);
    });

    it('returns false for non-existent sessionId', () => {
        const isValid = challengeStorage.validateAndConsumeChallenge(
            'non-existent',
            'challenge-abc',
        );
        assert(isValid.ok);
        expect(isValid.value).toBe(false);
    });

    it('returns false for wrong challenge', () => {
        challengeStorage.storeChallenge('session-123', 'challenge-abc');

        const isValid = challengeStorage.validateAndConsumeChallenge(
            'session-123',
            'wrong-challenge',
        );
        assert(isValid.ok);
        expect(isValid.value).toBe(false);
    });

    it('consumes challenge after validation', () => {
        challengeStorage.storeChallenge('session-123', 'challenge-abc');

        const isValid1 = challengeStorage.validateAndConsumeChallenge(
            'session-123',
            'challenge-abc',
        );
        assert(isValid1.ok);
        expect(isValid1.value).toBe(true);

        const isValid2 = challengeStorage.validateAndConsumeChallenge(
            'session-123',
            'challenge-abc',
        );
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

        storageWithTime.storeChallenge('session-123', 'challenge-abc', 30 * 1000);

        currentTime = 1000 + 31 * 1000;

        const isValid = storageWithTime.validateAndConsumeChallenge('session-123', 'challenge-abc');
        assert(isValid.ok);
        expect(isValid.value).toBe(false);
    });
});
