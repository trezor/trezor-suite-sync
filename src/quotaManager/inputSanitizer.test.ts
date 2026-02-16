import type { FastifyReply, FastifyRequest, RouteGenericInterface } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { inputSanitizer } from './inputSanitizer.js';

type SanitizerRoute = RouteGenericInterface & {
    Body?: Record<string, unknown>;
    Querystring?: Record<string, unknown>;
    Params?: Record<string, unknown>;
};

type SanitizerRequest = FastifyRequest<SanitizerRoute>;

type ReplyMocks = {
    reply: FastifyReply;
    status: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
};

const createRequest = (overrides: Partial<SanitizerRequest> = {}): SanitizerRequest =>
    ({ body: undefined, query: undefined, params: undefined, ...overrides }) as SanitizerRequest;

const createReply = () => {
    const status = vi.fn().mockReturnThis();
    const send = vi.fn().mockReturnThis();

    return {
        reply: { status, send } as unknown as FastifyReply,
        status,
        send,
    } satisfies ReplyMocks;
};

const createErrorReply = () => {
    const send = vi.fn();
    const status = vi.fn(() => ({ send }));

    return {
        reply: { status } as unknown as FastifyReply,
        status,
        send,
    } satisfies ReplyMocks;
};

describe(inputSanitizer.name, () => {
    it('sanitizes null bytes in request.body and calls done', () => {
        const request: SanitizerRequest = createRequest({ body: { name: 'ab\u0000c' } });

        const { reply, status } = createReply();

        const done = vi.fn();

        inputSanitizer(request, reply, done);

        expect(request.body?.name).toBe('abc');
        expect(done).toHaveBeenCalled();
        expect(status).not.toHaveBeenCalled();
    });

    it('sanitizes null bytes in query and params', () => {
        const request: SanitizerRequest = createRequest({
            query: { q: '\u0000foo' },
            params: { id: 'x\u0000y' },
        });

        const { reply, status } = createReply();

        const done = vi.fn();

        inputSanitizer(request, reply, done);

        expect(request.query?.q).toBe('foo');
        expect(request.params?.id).toBe('xy');
        expect(done).toHaveBeenCalled();
        expect(status).not.toHaveBeenCalled();
    });

    it('returns 400 if accessing body throws', () => {
        const request: SanitizerRequest = createRequest();
        Object.defineProperty(request, 'body', {
            get: () => {
                throw new Error('bad body');
            },
        });

        const { reply, send, status } = createErrorReply();
        const done = vi.fn();

        inputSanitizer(request, reply, done);

        expect(status).toHaveBeenCalledWith(400);
        expect(send).toHaveBeenCalledWith({
            error: 'Bad Request',
            message: 'Invalid request body',
        });
        expect(done).not.toHaveBeenCalled();
    });

    it('returns 400 if sanitizing query throws', () => {
        const request: SanitizerRequest = createRequest();
        Object.defineProperty(request, 'query', {
            get: () => {
                throw new Error('bad query');
            },
        });

        const { reply, send, status } = createErrorReply();
        const done = vi.fn();

        inputSanitizer(request, reply, done);

        expect(status).toHaveBeenCalledWith(400);
        expect(send).toHaveBeenCalledWith({
            error: 'Bad Request',
            message: 'Invalid query string',
        });
        expect(done).not.toHaveBeenCalled();
    });

    it('returns 400 if sanitizing params throws', () => {
        const request: SanitizerRequest = createRequest();
        Object.defineProperty(request, 'params', {
            get: () => {
                throw new Error('bad params');
            },
        });

        const { reply, send, status } = createErrorReply();
        const done = vi.fn();

        inputSanitizer(request, reply, done);

        expect(status).toHaveBeenCalledWith(400);
        expect(send).toHaveBeenCalledWith({
            error: 'Bad Request',
            message: 'Invalid route parameters',
        });
        expect(done).not.toHaveBeenCalled();
    });
});
