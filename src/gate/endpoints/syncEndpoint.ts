import type { ServerType } from '../server.ts';

const schema = {
    schema: {
        querystring: {
            type: 'object',
            properties: {
                ownerId: { type: 'string' },
            },
            required: ['ownerId'],
        },
    },
} as const;

export const syncEndpoint = (server: ServerType) => {
    server.get('/sync', schema, (request, reply) => {
        const { ownerId } = request.query;

        // Todo: implement

        return { ownerId };
    });
};
