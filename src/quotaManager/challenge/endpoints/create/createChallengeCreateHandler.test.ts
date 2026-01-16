import { assert, describe, expect, it } from 'vitest';

import { challengeCreateRequestSchema } from './challengeCreateSchema.js';
import { createChallengeCreateHandler } from './createChallengeCreateHandler.js';
import { createChallengeCreateOperation } from './createChallengeCreateOperation.js';
import { getOrThrowTest } from '../../../../getOrThrowTest.js';
import { SessionId } from '../../../../storage/challengeStorage/createChallengeStorage.js';
import { createCleanupExpiredChallenges } from '../../../../storage/challengeStorage/methods/createCleanupExpiredChallenges.js';
import { createDeleteChallenge } from '../../../../storage/challengeStorage/methods/createDeleteChallenge.js';
import { createStoreChallenge } from '../../../../storage/challengeStorage/methods/createStoreChallenge.js';
import { createValidateAndConsumeChallenge } from '../../../../storage/challengeStorage/methods/createValidateAndConsumeChallenge.js';
import { createTestDatabase } from '../../../../storage/posgres/createTestDatabase.js';
import { GenerateRandomBytes, GenerateRandomBytesDep } from '../../../GenerateRandomBytes.js';
import { createFastifyServer } from '../../../createFastifyServer.js';
import { evoluValidatorCompiler } from '../../../evoluValidatorCompiler.js';

const generateStaticRandomBytes: GenerateRandomBytes = () =>
    '751a1339214468ac23ad32844482f9c76e54d2e95afd1940fe6b7e3e5fbc2f61';

const session1 = getOrThrowTest(SessionId.from('krdo9P9YkVGUVM4nznXTZYIroFsTM3iM'));

type CreateAppDeps = GenerateRandomBytesDep;

/**
 * This is composition root of the app for tests. This is a lot of code as this is a heavy
 * integration test.
 */
const createApp = async (deps: Partial<CreateAppDeps> = {}) => {
    const createTime = () => Date.now(); // Todo: freeze

    const db = await createTestDatabase();

    const storeChallenge = createStoreChallenge({ db, createTime });

    const cleanupExpiredChallenges = createCleanupExpiredChallenges({ db, createTime });

    const challengeCreateOperation = createChallengeCreateOperation({
        cleanupExpiredChallenges,
        storeChallenge,
        generateRandomBytes: deps?.generateRandomBytes ?? generateStaticRandomBytes,
    });
    const challengeCreateHandler = createChallengeCreateHandler({ challengeCreateOperation });

    const app = createFastifyServer({ updateHealth: () => {} });
    app.setValidatorCompiler(evoluValidatorCompiler);

    app.post('/challenge', challengeCreateRequestSchema, challengeCreateHandler);

    return { app, createTime, db };
};

// Todo: audit this test, some of test-cases shall be tested on lower level
describe(createChallengeCreateHandler.name, () => {
    it('returns challenge for valid sessionId', async () => {
        const { app } = await createApp();

        const response = await app.inject({
            method: 'POST',
            url: '/challenge',
            payload: { sessionId: 'krdo9P9YkVGUVM4nznXTZYIroFsTM3iM' },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('challenge');
        expect(body.challenge).toBe(
            '751a1339214468ac23ad32844482f9c76e54d2e95afd1940fe6b7e3e5fbc2f61',
        );
    });

    it('generates unique challenges for same sessionId on multiple calls', async () => {
        const { app: app1 } = await createApp();

        const response1 = await app1.inject({
            method: 'POST',
            url: '/challenge',
            payload: { sessionId: 'krdo9P9YkVGUVM4nznXTZYIroFsTM3iM' },
        });

        const { app: app2 } = await createApp({ generateRandomBytes: () => 'ABC' });
        const response2 = await app2.inject({
            method: 'POST',
            url: '/challenge',
            payload: { sessionId: 'krdo9P9YkVGUVM4nznXTZYIroFsTM3iM' },
        });

        const body1 = JSON.parse(response1.body);
        const body2 = JSON.parse(response2.body);

        expect(body1.challenge).not.toBe(body2.challenge);
    });

    it('generates different challenges for different sessionIds', async () => {
        const { app } = await createApp();

        const response1 = await app.inject({
            method: 'POST',
            url: '/challenge',
            payload: { sessionId: 'krdo9P9YkVGUVM4nznXTZYIroFsTM3iM' },
        });

        const { app: server2 } = await createApp({ generateRandomBytes: () => 'ABC' });
        const response2 = await server2.inject({
            method: 'POST',
            url: '/challenge',
            payload: { sessionId: 'XYRnoWi8zKnDnRKlxzeRnfBm9hxYeh9D' },
        });

        const body1 = JSON.parse(response1.body);
        const body2 = JSON.parse(response2.body);

        expect(body1.challenge).not.toBe(body2.challenge);
    });

    it('stores challenge that can be validated', async () => {
        const { app, db, createTime } = await createApp();

        const deleteChallenge = createDeleteChallenge({ db });

        const validateAndConsumeChallenge = createValidateAndConsumeChallenge({
            db,
            createTime,
            deleteChallenge,
        });

        const response = await app.inject({
            method: 'POST',
            url: '/challenge',
            payload: { sessionId: session1.toString() },
        });

        const body = JSON.parse(response.body);
        const isValid = await validateAndConsumeChallenge({
            sessionId: session1,
            challenge: body.challenge,
        });

        assert(isValid.ok);
        expect(isValid.value).toBe(true);
    });

    it('returns 400 when sessionId is missing', async () => {
        const { app } = await createApp();

        const response = await app.inject({
            method: 'POST',
            url: '/challenge',
            payload: {},
        });

        expect(response.statusCode).toBe(400);
    });
});
