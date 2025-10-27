import { describe, expect, it } from 'vitest';
import { challengeEndpoint } from './challengeEndpoint.js';
import { getOrThrow } from '@evolu/common';
import Fastify from 'fastify';
import { prepareSqlite } from '../../storage/prepareSqlite.js';
import { createChallengeStorage } from '../../storage/challengeStorage/challengeStorage.js';

const staticCreateRandomBytes = () =>
    '751a1339214468ac23ad32844482f9c76e54d2e95afd1940fe6b7e3e5fbc2f61';

const createApp = async () => {
    const sqlite = getOrThrow(await prepareSqlite({ inMemory: true }));
    const challengeStorage = createChallengeStorage({ sqlite });
    const app = Fastify();
    challengeEndpoint({
        server: app,
        challengeStorage,
        createRandomBytes: staticCreateRandomBytes,
    });
    return { app, challengeStorage };
};

describe(challengeEndpoint.name, () => {
    it('returns challenge for valid sessionId', async () => {
        const { app } = await createApp();

        const response = await app.inject({
            method: 'POST',
            url: '/challenge',
            payload: { sessionId: 'session-123' },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('challenge');
        expect(body.challenge).toBe(
            '751a1339214468ac23ad32844482f9c76e54d2e95afd1940fe6b7e3e5fbc2f61',
        );
    });

    it('generates unique challenges for same sessionId on multiple calls', async () => {
        const { app } = await createApp();

        const response1 = await app.inject({
            method: 'POST',
            url: '/challenge',
            payload: { sessionId: 'session-123' },
        });

        const response2 = await app.inject({
            method: 'POST',
            url: '/challenge',
            payload: { sessionId: 'session-123' },
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
            payload: { sessionId: 'session-123' },
        });

        const response2 = await app.inject({
            method: 'POST',
            url: '/challenge',
            payload: { sessionId: 'session-456' },
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
            payload: { sessionId: 'session-123' },
        });

        const body = JSON.parse(response.body);
        const isValid = getOrThrow(
            challengeStorage.validateAndConsumeChallenge('session-123', body.challenge),
        );

        expect(isValid).toBe(true);
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
