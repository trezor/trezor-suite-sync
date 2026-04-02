import { OwnerId, err, ok } from '@evolu/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it } from 'vitest';

import { createStorageAskHandler } from './createStorageAskHandler.js';
import { getOrThrowTest } from '../../../../getOrThrowTest.js';
import { PublicKey, Size } from '../../../../storage/limitStorage/limitStorage.js';
import { GetLimitsForOwner } from '../../../../storage/limitStorage/methods/createGetLimitsForOwner.js';
import { GetLimitsForPubkey } from '../../../../storage/limitStorage/methods/createGetLimitsForPubkey.js';

const ownerId = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJg6g'));
const publicKey = getOrThrowTest(
    PublicKey.from(
        '049bbf06dad9ab5905e05471ce16d5222c89c2caa39f26267ac0747129885fbd441bcc7fa84de120a36755daf30a6f47e8c0d4bddc15036ed2a3447dfa7a1d3e88',
    ),
);
const size100 = getOrThrowTest(Size.from(100));
const size80 = getOrThrowTest(Size.from(80));

const createMockRequest = (
    body: Record<string, unknown>,
    headers: Record<string, string> = {},
) =>
    ({
        body,
        headers,
    }) as unknown as FastifyRequest<{ Body: typeof body }>;

const createMockReply = () => {
    let statusCode = 200;
    let sentBody: unknown;

    const reply = {
        code(code: number) {
            statusCode = code;

            return reply;
        },
        send(body: unknown) {
            sentBody = body;

            return reply;
        },
        get statusCode() {
            return statusCode;
        },
        get sentBody() {
            return sentBody;
        },
    };

    return reply as typeof reply & FastifyReply;
};

describe(createStorageAskHandler.name, () => {
    const defaultDeps = {
        getLimitsForOwner: (() => Promise.resolve(ok(null))) as GetLimitsForOwner,
        getLimitsForPubkey: (() => Promise.resolve(ok(null))) as GetLimitsForPubkey,
    };

    describe('ownerId queries', () => {
        it('returns 200 with Allocated status when owner exists', async () => {
            const handler = createStorageAskHandler({
                ...defaultDeps,
                getLimitsForOwner: () => Promise.resolve(ok(size100 as number)),
            });
            const request = createMockRequest({ ownerId: ownerId.toString() });
            const reply = createMockReply();

            await handler(request, reply);

            expect(reply.statusCode).toBe(200);
            expect(reply.sentBody).toEqual({ status: 'Allocated', totalSpace: size100 });
        });

        it('returns 200 with NoQuota status when owner does not exist', async () => {
            const handler = createStorageAskHandler(defaultDeps);
            const request = createMockRequest({ ownerId: ownerId.toString() });
            const reply = createMockReply();

            await handler(request, reply);

            expect(reply.statusCode).toBe(200);
            expect(reply.sentBody).toEqual({ status: 'NoQuota' });
        });

        it('returns 500 on database error', async () => {
            const handler = createStorageAskHandler({
                ...defaultDeps,
                getLimitsForOwner: () =>
                    Promise.resolve(err({ type: 'DatabaseError' as const, error: new Error() })),
            });
            const request = createMockRequest({ ownerId: ownerId.toString() });
            const reply = createMockReply();

            await handler(request, reply);

            expect(reply.statusCode).toBe(500);
            expect(reply.sentBody).toEqual({ error: 'Internal server error' });
        });
    });

    describe('publicKey queries', () => {
        it('returns 200 with Allocated status when publicKey exists', async () => {
            const handler = createStorageAskHandler({
                ...defaultDeps,
                getLimitsForPubkey: () =>
                    Promise.resolve(
                        ok({
                            totalStorageSize: size100,
                            unspentStorageSize: size80,
                        }),
                    ),
            });
            const request = createMockRequest({ publicKey: publicKey.toString() });
            const reply = createMockReply();

            await handler(request, reply);

            expect(reply.statusCode).toBe(200);
            expect(reply.sentBody).toEqual({
                status: 'Allocated',
                totalSpace: size100,
                unspentSpace: size80,
            });
        });

        it('returns 200 with NoQuota status when publicKey does not exist', async () => {
            const handler = createStorageAskHandler(defaultDeps);
            const request = createMockRequest({ publicKey: publicKey.toString() });
            const reply = createMockReply();

            await handler(request, reply);

            expect(reply.statusCode).toBe(200);
            expect(reply.sentBody).toEqual({ status: 'NoQuota' });
        });

        it('returns 500 on database error', async () => {
            const handler = createStorageAskHandler({
                ...defaultDeps,
                getLimitsForPubkey: () =>
                    Promise.resolve(err({ type: 'DatabaseError' as const, error: new Error() })),
            });
            const request = createMockRequest({ publicKey: publicKey.toString() });
            const reply = createMockReply();

            await handler(request, reply);

            expect(reply.statusCode).toBe(500);
            expect(reply.sentBody).toEqual({ error: 'Internal server error' });
        });
    });

    it('returns 400 when neither ownerId nor publicKey is provided', async () => {
        const handler = createStorageAskHandler(defaultDeps);
        const request = createMockRequest({});
        const reply = createMockReply();

        await handler(request, reply);

        expect(reply.statusCode).toBe(400);
        expect(reply.sentBody).toEqual({ error: 'Either ownerId or publicKey is required' });
    });
});
