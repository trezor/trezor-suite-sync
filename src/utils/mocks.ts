import { FastifyReply, FastifyRequest } from 'fastify';

export const createMockRequest = (
    body: Record<string, unknown>,
    headers: Record<string, string> = {},
) =>
    ({
        body,
        headers,
    }) as unknown as FastifyRequest<{ Body: typeof body }>;

export const createMockReply = () => {
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
