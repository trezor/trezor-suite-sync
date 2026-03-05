import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import { allowOriginMiddleware } from './allowOriginMiddleware.js';

describe(allowOriginMiddleware.name, () => {
    it('allows any origin', async () => {
        const server = Fastify();
        server.addHook('onRequest', allowOriginMiddleware);

        server.get('/ok', () => ({ ok: true }));

        const response = await server.inject({
            method: 'GET',
            url: '/ok',
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers).not.toHaveProperty('test-headers');
        expect(response.headers).toHaveProperty('access-control-allow-origin', '*');
    });
});
