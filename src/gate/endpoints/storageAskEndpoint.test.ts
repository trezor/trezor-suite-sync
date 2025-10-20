import { describe, expect, test, beforeEach } from 'vitest';
import { storageAskEndpoint } from './storageAskEndpoint.js';
import { prepareSqlite } from '../../limitStorage/limitStorage.js';
import { getOrThrow, Sqlite, err, ok } from '@evolu/common';
import Fastify, { type FastifyInstance } from 'fastify';

describe(storageAskEndpoint.name, () => {
    let app: FastifyInstance;
    let sqlite: Sqlite;

    beforeEach(async () => {
        sqlite = getOrThrow(await prepareSqlite({ inMemory: true }));
        app = Fastify();
        
        storageAskEndpoint({ 
            server: app, 
            limitStorage: { 
                getLimitForOwner: () => ok(100),
                getLimitForPubkey: () => ok({ totalStorageSize: 200, unspendStorageSize: 150 }),
                addLimitToPubkey: () => ok({ totalStorageSize: 0, unspendStorageSize: 0 }),
                transferSpaceLimitToOwner: () => ok(null)
            } 
        });
    });

    test('returns total space for ownerId', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/storage/ask?ownerId=test-owner'
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ totalSpace: 100 });
    });

    test('returns total and unspent space for publicKey', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/storage/ask?publicKey=test-pubkey'
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ 
            totalSpace: 200, 
            unspentSpace: 150 
        });
    });

    test('returns 404 when owner not found', async () => {
        const mockLimitStorage = {
            getLimitForOwner: () => ok(null),
            getLimitForPubkey: () => ok(null),
            addLimitToPubkey: () => ok({ totalStorageSize: 0, unspendStorageSize: 0 }),
            transferSpaceLimitToOwner: () => ok(null)
        };

        const testApp = Fastify();
        storageAskEndpoint({ server: testApp, limitStorage: mockLimitStorage });

        const response = await testApp.inject({
            method: 'GET',
            url: '/storage/ask?ownerId=nonexistent'
        });

        expect(response.statusCode).toBe(404);
        expect(JSON.parse(response.body)).toEqual({ error: 'Owner not found' });
    });

    test('returns 404 when public key not found', async () => {
        const mockLimitStorage = {
            getLimitForOwner: () => ok(100),
            getLimitForPubkey: () => ok(null),
            addLimitToPubkey: () => ok({ totalStorageSize: 0, unspendStorageSize: 0 }),
            transferSpaceLimitToOwner: () => ok(null)
        };

        const testApp = Fastify();
        storageAskEndpoint({ server: testApp, limitStorage: mockLimitStorage });

        const response = await testApp.inject({
            method: 'GET',
            url: '/storage/ask?publicKey=nonexistent'
        });

        expect(response.statusCode).toBe(404);
        expect(JSON.parse(response.body)).toEqual({ error: 'Public key not found' });
    });

    test('returns 400 when neither parameter provided', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/storage/ask'
        });

        expect(response.statusCode).toBe(400);
    });
});