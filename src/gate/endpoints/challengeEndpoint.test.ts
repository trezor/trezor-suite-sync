import { getOrThrow } from '@evolu/common';
import Fastify from 'fastify';
import { assert, describe, expect, it } from 'vitest';

import { challengeEndpoint } from './challengeEndpoint.js';
import {
    SessionId,
    createChallengeStorage,
} from '../../storage/challengeStorage/challengeStorage.js';
import { prepareSqlite } from '../../storage/prepareSqlite.js';

const staticCreateRandomBytes = () =>
    '751a1339214468ac23ad32844482f9c76e54d2e95afd1940fe6b7e3e5fbc2f61';

const session1 = getOrThrow(SessionId.from('krdo9P9YkVGUVM4nznXTZYIroFsTM3iM'));

type CreateAppParams = {
    createRandomBytes?: (size: number) => string;
};

const createApp = async (params?: CreateAppParams) => {
    const sqlite = await prepareSqlite({ inMemory: true });
    assert(sqlite.ok);

    const challengeStorage = createChallengeStorage({ sqlite: sqlite.value });
    assert(challengeStorage.ok);

    const app = Fastify();

    challengeEndpoint({
        server: app,
        challengeStorage: challengeStorage.value,
        createRandomBytes: params?.createRandomBytes ?? staticCreateRandomBytes,
    });

    return { app, challengeStorage: challengeStorage.value };
};

describe(challengeEndpoint.name, () => {
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

        const { app: app2 } = await createApp({ createRandomBytes: () => 'ABC' });
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

        const { app: app2 } = await createApp({ createRandomBytes: () => 'ABC' });
        const response2 = await app2.inject({
            method: 'POST',
            url: '/challenge',
            payload: { sessionId: 'XYRnoWi8zKnDnRKlxzeRnfBm9hxYeh9D' },
        });

        const body1 = JSON.parse(response1.body);
        const body2 = JSON.parse(response2.body);

        expect(body1.challenge).not.toBe(body2.challenge);
    });

    it('stores challenge that can be validated', async () => {
        const { app, challengeStorage } = await createApp();

        const response = await app.inject({
            method: 'POST',
            url: '/challenge',
            payload: { sessionId: session1.toString() },
        });

        const body = JSON.parse(response.body);
        const isValid = challengeStorage.validateAndConsumeChallenge(session1, body.challenge);

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
