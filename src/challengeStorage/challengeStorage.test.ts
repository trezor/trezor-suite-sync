import { describe, expect, it, beforeEach } from 'vitest';
import { getOrThrow } from '@evolu/common';
import { prepareSqlite } from '../limitStorage/limitStorage.js';
import { createChallengeStorage } from './challengeStorage.js';

describe('challengeStorage', () => {
    let challengeStorage: ReturnType<typeof createChallengeStorage>;

    beforeEach(async () => {
        const sqlite = getOrThrow(await prepareSqlite({ inMemory: true }));
        challengeStorage = createChallengeStorage({ sqlite });
    });

    it('stores challenge successfully', () => {
        const result = challengeStorage.storeChallenge('session-123', 'challenge-abc');
        expect(result.ok).toBe(true);
    });

    it('replaces existing challenge for same sessionId', () => {
        challengeStorage.storeChallenge('session-123', 'challenge-old');
        challengeStorage.storeChallenge('session-123', 'challenge-new');

        const isValid = getOrThrow(challengeStorage.validateAndConsumeChallenge('session-123', 'challenge-new'));
        expect(isValid).toBe(true);
    });

    it('validates correct challenge', () => {
        challengeStorage.storeChallenge('session-123', 'challenge-abc');
        
        const isValid = getOrThrow(challengeStorage.validateAndConsumeChallenge('session-123', 'challenge-abc'));
        expect(isValid).toBe(true);
    });

    it('returns false for non-existent sessionId', () => {
        const isValid = getOrThrow(challengeStorage.validateAndConsumeChallenge('non-existent', 'challenge-abc'));
        expect(isValid).toBe(false);
    });

    it('returns false for wrong challenge', () => {
        challengeStorage.storeChallenge('session-123', 'challenge-abc');
        
        const isValid = getOrThrow(challengeStorage.validateAndConsumeChallenge('session-123', 'wrong-challenge'));
        expect(isValid).toBe(false);
    });

    it('consumes challenge after validation', () => {
        challengeStorage.storeChallenge('session-123', 'challenge-abc');
        
        const isValid1 = getOrThrow(challengeStorage.validateAndConsumeChallenge('session-123', 'challenge-abc'));
        expect(isValid1).toBe(true);

        const isValid2 = getOrThrow(challengeStorage.validateAndConsumeChallenge('session-123', 'challenge-abc'));
        expect(isValid2).toBe(false);
    });

    it('returns false for expired challenge', async () => {
        challengeStorage.storeChallenge('session-123', 'challenge-abc', 0);
        
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const isValid = getOrThrow(challengeStorage.validateAndConsumeChallenge('session-123', 'challenge-abc'));
        expect(isValid).toBe(false);
    });
});