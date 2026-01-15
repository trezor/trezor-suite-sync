import fastifyMiddie from '@fastify/middie';
import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import { banMiddleware } from './banMiddleware.js';

describe(banMiddleware.name, () => {
    it('returns 403 when Suite-Version is banned', async () => {
        const server = Fastify();
        await server.register(fastifyMiddie);

        server.use((req, res, next) => banMiddleware(req, res, next));

        server.get('/ok', () => ({ ok: true }));

        const response = await server.inject({
            method: 'GET',
            url: '/ok',
            headers: { 'Suite-Version': 'ban-test' },
        });

        expect(response.statusCode).toBe(403);
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('error');
        expect(body).toHaveProperty('version', 'ban-test');
        expect(body.error).toEqual('BANNED_CLIENT_VERSION');
    });

    it('passes through when Suite-Version is not banned', async () => {
        const server = Fastify();
        await server.register(fastifyMiddie);

        server.use((req, res, next) => banMiddleware(req, res, next));

        server.get('/ok', () => ({ ok: true }));

        const response = await server.inject({ method: 'GET', url: '/ok' });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body).toMatchObject({ ok: true });
    });
});
