import { OwnerId, object, optional } from '@evolu/common';

import { PublicKey } from '../../../../storage/limitStorage/limitStorage.js';

export const storageAskRequestSchema = {
    schema: {
        querystring: {
            type: 'object',
            properties: {
                ownerId: { type: 'string' },
                publicKey: { type: 'string' },
            },
            // At least one must be provided
            anyOf: [{ required: ['ownerId'] }, { required: ['publicKey'] }],
        },
    },
} as const;

export const askEvoluSchema = object({
    publicKey: optional(PublicKey),
    ownerId: optional(OwnerId),
});
