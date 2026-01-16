import { assert, describe, expect, it } from 'vitest';

import { createDeleteChallenge } from './createDeleteChallenge.js';
import { createStoreChallenge } from './createStoreChallenge.js';
import { getOrThrowTest } from '../../../getOrThrowTest.js';
import { createTestDatabase } from '../../posgres/createTestDatabase.js';
import { Challenge, SessionId } from '../createChallengeStorage.js';

const session123 = getOrThrowTest(SessionId.from('session-123'));
const session456 = getOrThrowTest(SessionId.from('session-456'));
const challengeABC = getOrThrowTest(Challenge.from('challenge-abc'));

describe(createDeleteChallenge.name, () => {
    it('deletes challenge successfully', async () => {
        const db = await createTestDatabase();
        const storeChallenge = createStoreChallenge({ db, createTime: () => Date.now() });
        const deleteChallenge = createDeleteChallenge({ db });

        await storeChallenge({ sessionId: session123, challenge: challengeABC });

        const result = await deleteChallenge({ sessionId: session123 });
        assert(result.ok);

        const stored = await db
            .selectFrom('challenges')
            .where('sessionId', '=', session123)
            .selectAll()
            .executeTakeFirst();

        expect(stored).toBe(undefined);
    });

    it('returns success when deleting non-existent challenge', async () => {
        const db = await createTestDatabase();
        const deleteChallenge = createDeleteChallenge({ db });

        const result = await deleteChallenge({ sessionId: session456 });
        assert(result.ok);
        expect(result.value).toBe(undefined);
    });

    it('only deletes specified session', async () => {
        const db = await createTestDatabase();
        const storeChallenge = createStoreChallenge({ db, createTime: () => Date.now() });
        const deleteChallenge = createDeleteChallenge({ db });

        await storeChallenge({ sessionId: session123, challenge: challengeABC });
        await storeChallenge({ sessionId: session456, challenge: challengeABC });

        const result = await deleteChallenge({ sessionId: session123 });
        assert(result.ok);

        const stored123 = await db
            .selectFrom('challenges')
            .where('sessionId', '=', session123)
            .selectAll()
            .executeTakeFirst();

        const stored456 = await db
            .selectFrom('challenges')
            .where('sessionId', '=', session456)
            .selectAll()
            .executeTakeFirst();

        expect(stored123).toBe(undefined);
        expect(stored456).toBeDefined();
    });
});
