import { OwnerId } from '@evolu/common';
import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import { getOrThrowTest } from '../../../../getOrThrowTest.js';
import { evoluValidatorCompiler } from '../../../evoluValidatorCompiler.js';
import { registerSyncEndpoints } from '../../registerSyncEndpoints.js';

const ownerId1 = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJg6g'));

type CreateAppParams = {};

const createApp = (params?: CreateAppParams) => {
    const server = Fastify();

    server.setValidatorCompiler(evoluValidatorCompiler);

    registerSyncEndpoints({ server });

    return {
        server,
    };
};

describe('GET /sync', () => {
    it('returns 400 when endpoint is not implemented', async () => {
        const { server } = await createApp();

        const response = await server.inject({
            method: 'GET',
            url: `/sync?ownerId=${encodeURIComponent(ownerId1.toString())}`,
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error).toBe('NotImplemented');
    });
});
