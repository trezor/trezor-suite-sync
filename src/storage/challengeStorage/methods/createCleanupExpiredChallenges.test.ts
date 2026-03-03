import { assert, describe, expect, it } from 'vitest';

import { createCleanupExpiredChallenges } from './createCleanupExpiredChallenges.js';
import { createStoreChallenge } from './createStoreChallenge.js';
import { getOrThrowTest } from '../../../getOrThrowTest.js';
import { createTestDatabase } from '../../postgres/createTestDatabase.js';
import { Challenge, SessionId } from '../createChallengeStorage.js';

const session123 = getOrThrowTest(SessionId.from('session-123'));
const session456 = getOrThrowTest(SessionId.from('session-456'));
const challengeABC = getOrThrowTest(Challenge.from('challenge-abc'));
const challengeXYZ = getOrThrowTest(Challenge.from('challenge-xyz'));

describe(createCleanupExpiredChallenges.name, () => {
    it('removes expired challenges', async () => {
        let currentTime = 1000;
        const db = await createTestDatabase();
        const storeChallenge = createStoreChallenge({ db, createTime: () => currentTime });

        await storeChallenge({ sessionId: session123, challenge: challengeABC });

        currentTime = 1000 + 31 * 1000;

        const cleanupExpiredChallenges = createCleanupExpiredChallenges({
            db,
            createTime: () => currentTime,
        });

        const result = await cleanupExpiredChallenges();
        assert(result.ok);

        const stored = await db.selectFrom('challenges').selectAll().execute();

        expect(stored.length).toBe(0);
    });

    it('keeps non-expired challenges', async () => {
        let currentTime = 1000;
        const db = await createTestDatabase();
        const storeChallenge = createStoreChallenge({ db, createTime: () => currentTime });

        await storeChallenge({ sessionId: session123, challenge: challengeABC });

        currentTime = 1000 + 29 * 1000;

        const cleanupExpiredChallenges = createCleanupExpiredChallenges({
            db,
            createTime: () => currentTime,
        });

        const result = await cleanupExpiredChallenges();
        assert(result.ok);

        const stored = await db.selectFrom('challenges').selectAll().execute();

        expect(stored.length).toBe(1);
        expect(stored[0]?.sessionId).toBe(session123);
    });

    it('removes only expired challenges, keeps fresh ones', async () => {
        let currentTime = 1000;
        const db = await createTestDatabase();
        const storeChallenge = createStoreChallenge({ db, createTime: () => currentTime });

        await storeChallenge({ sessionId: session123, challenge: challengeABC });

        currentTime = 1000 + 31 * 1000;

        await storeChallenge({ sessionId: session456, challenge: challengeXYZ });

        const cleanupExpiredChallenges = createCleanupExpiredChallenges({
            db,
            createTime: () => currentTime,
        });

        const result = await cleanupExpiredChallenges();
        assert(result.ok);

        const stored = await db.selectFrom('challenges').selectAll().execute();

        expect(stored.length).toBe(1);
        expect(stored[0]?.sessionId).toBe(session456);
    });

    it('handles cleanup with no challenges', async () => {
        const db = await createTestDatabase();
        const cleanupExpiredChallenges = createCleanupExpiredChallenges({
            db,
            createTime: () => Date.now(),
        });

        const result = await cleanupExpiredChallenges();
        assert(result.ok);
        expect(result.value).toBe(undefined);
    });
});
