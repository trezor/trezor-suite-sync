import { describe, expect, it } from 'vitest';
import { storageAskEndpoint, StorageAskEndpointDeps } from './storageAskEndpoint.js';
import { ok } from '@evolu/common';
import Fastify from 'fastify';

const createApp = (limitStorage: StorageAskEndpointDeps['limitStorage']) => {
    const app = Fastify();
    storageAskEndpoint({ server: app, limitStorage });

    return app;
};

describe(storageAskEndpoint.name, () => {
    it('returns total space for ownerId', async () => {
        const app = await createApp({
            getLimitForOwner: () => ok(100),
            getLimitForPubkey: () => ok({ totalStorageSize: 200, unspendStorageSize: 150 }),
        });

        const response = await app.inject({
            method: 'GET',
            url: '/storage/ask?ownerId=test-owner',
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ totalSpace: 100 });
    });

    it('returns total and unspent space for publicKey', async () => {
        const app = await createApp({
            getLimitForOwner: () => ok(100),
            getLimitForPubkey: () => ok({ totalStorageSize: 200, unspendStorageSize: 150 }),
        });

        const response = await app.inject({
            method: 'GET',
            url: '/storage/ask?publicKey=test-pubkey',
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual({
            totalSpace: 200,
            unspentSpace: 150,
        });
    });

    it('returns 404 when owner not found', async () => {
        const app = await createApp({
            getLimitForOwner: () => ok(null),
            getLimitForPubkey: () => ok({ totalStorageSize: 200, unspendStorageSize: 150 }),
        });

        const response = await app.inject({
            method: 'GET',
            url: '/storage/ask?ownerId=nonexistent',
        });

        expect(response.statusCode).toBe(404);
        expect(JSON.parse(response.body)).toEqual({ error: 'Owner not found' });
    });

    it('returns 404 when public key not found', async () => {
        const app = await createApp({
            getLimitForOwner: () => ok(100),
            getLimitForPubkey: () => ok(null),
        });

        const response = await app.inject({
            method: 'GET',
            url: '/storage/ask?publicKey=nonexistent',
        });

        expect(response.statusCode).toBe(404);
        expect(JSON.parse(response.body)).toEqual({ error: 'Public key not found' });
    });

    it('returns 400 when neither parameter provided', async () => {
        const app = await createApp({
            getLimitForOwner: () => ok(100),
            getLimitForPubkey: () => ok({ totalStorageSize: 200, unspendStorageSize: 150 }),
        });

        const response = await app.inject({
            method: 'GET',
            url: '/storage/ask',
        });

        expect(response.statusCode).toBe(400);
    });

    it('handles zero storage limits for ownerId', async () => {
        const app = await createApp({
            getLimitForOwner: () => ok(0),
            getLimitForPubkey: () => ok({ totalStorageSize: 200, unspendStorageSize: 150 }),
        });

        const response = await app.inject({
            method: 'GET',
            url: '/storage/ask?ownerId=test-owner',
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ totalSpace: 0 });
    });

    it('handles large storage limits for ownerId', async () => {
        const app = await createApp({
            getLimitForOwner: () => ok(999999999),
            getLimitForPubkey: () => ok({ totalStorageSize: 200, unspendStorageSize: 150 }),
        });

        const response = await app.inject({
            method: 'GET',
            url: '/storage/ask?ownerId=test-owner',
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ totalSpace: 999999999 });
    });

    it('handles large storage limits for publicKey', async () => {
        const app = await createApp({
            getLimitForOwner: () => ok(100),
            getLimitForPubkey: () =>
                ok({ totalStorageSize: 999999999, unspendStorageSize: 888888888 }),
        });

        const response = await app.inject({
            method: 'GET',
            url: '/storage/ask?publicKey=test-pubkey',
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual({
            totalSpace: 999999999,
            unspentSpace: 888888888,
        });
    });

    it('handles empty string ownerId', async () => {
        const app = await createApp({
            getLimitForOwner: () => ok(null),
            getLimitForPubkey: () => ok({ totalStorageSize: 200, unspendStorageSize: 150 }),
        });

        const response = await app.inject({
            method: 'GET',
            url: '/storage/ask?ownerId=',
        });

        expect(response.statusCode).toBe(404);
        expect(JSON.parse(response.body)).toEqual({ error: 'Owner not found' });
    });

    it('handles empty string publicKey', async () => {
        const app = await createApp({
            getLimitForOwner: () => ok(100),
            getLimitForPubkey: () => ok(null),
        });

        const response = await app.inject({
            method: 'GET',
            url: '/storage/ask?publicKey=a',
        });

        expect(response.statusCode).toBe(404);
        expect(JSON.parse(response.body)).toEqual({ error: 'Public key not found' });
    });

    it('handles special characters in ownerId', async () => {
        const app = await createApp({
            getLimitForOwner: () => ok(100),
            getLimitForPubkey: () => ok({ totalStorageSize: 200, unspendStorageSize: 150 }),
        });

        const response = await app.inject({
            method: 'GET',
            url: '/storage/ask?ownerId=test-owner@domain.com',
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ totalSpace: 100 });
    });

    it('handles special characters in publicKey', async () => {
        const app = await createApp({
            getLimitForOwner: () => ok(100),
            getLimitForPubkey: () => ok({ totalStorageSize: 200, unspendStorageSize: 150 }),
        });

        const response = await app.inject({
            method: 'GET',
            url: '/storage/ask?publicKey=test-pubkey-with-special-chars!@#$%',
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual({
            totalSpace: 200,
            unspentSpace: 150,
        });
    });

    it('handles both parameters provided (ownerId takes precedence)', async () => {
        const app = await createApp({
            getLimitForOwner: () => ok(100),
            getLimitForPubkey: () => ok({ totalStorageSize: 200, unspendStorageSize: 150 }),
        });

        const response = await app.inject({
            method: 'GET',
            url: '/storage/ask?ownerId=test-owner&publicKey=test-pubkey',
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ totalSpace: 100 });
    });
});
