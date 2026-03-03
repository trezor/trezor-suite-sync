import { assert, describe, expect, it } from 'vitest';

import { createStoreChallenge } from './createStoreChallenge.js';
import { getOrThrowTest } from '../../../getOrThrowTest.js';
import { createTestDatabase } from '../../postgres/createTestDatabase.js';
import { Challenge, SessionId } from '../createChallengeStorage.js';

const session123 = getOrThrowTest(SessionId.from('session-123'));
const challengeABC = getOrThrowTest(Challenge.from('challenge-abc'));
const challengeOld = getOrThrowTest(Challenge.from('challenge-old'));
const challengeNew = getOrThrowTest(Challenge.from('challenge-new'));

describe(createStoreChallenge.name, () => {
    it('stores challenge successfully', async () => {
        const db = await createTestDatabase();
        const storeChallenge = createStoreChallenge({ db, createTime: () => Date.now() });

        const result = await storeChallenge({
            sessionId: session123,
            challenge: challengeABC,
        });

        assert(result.ok);
        expect(result.value).toBe(undefined);
    });

    it('replaces existing challenge for same sessionId', async () => {
        const db = await createTestDatabase();
        const storeChallenge = createStoreChallenge({ db, createTime: () => Date.now() });

        const result1 = await storeChallenge({
            sessionId: session123,
            challenge: challengeOld,
        });
        assert(result1.ok);

        const result2 = await storeChallenge({
            sessionId: session123,
            challenge: challengeNew,
        });
        assert(result2.ok);

        // Verify new challenge was stored by checking database
        const stored = await db
            .selectFrom('challenges')
            .where('sessionId', '=', session123)
            .select(['challenge'])
            .executeTakeFirst();

        expect(stored?.challenge).toBe(challengeNew);
    });
});
