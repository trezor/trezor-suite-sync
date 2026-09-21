import { type ObjectType, OwnerId, object, optional } from '@evolu/common';

import { PublicKey } from '../../../../storage/limitStorage/limitStorage.js';
import { type EvoluRequestSchema } from '../../../evoluValidatorCompiler.js';

const askProps = {
    publicKey: optional(PublicKey),
    ownerId: optional(OwnerId),
};

export const askEvoluSchema: ObjectType<typeof askProps> = object(askProps);

export const storageAskRequestSchema: EvoluRequestSchema<typeof askEvoluSchema> = {
    schema: {
        body: {
            evoluSchema: askEvoluSchema,
        },
    },
};
