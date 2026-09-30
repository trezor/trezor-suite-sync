import { type ObjectType, OwnerId, object } from '@evolu/common';

import {
    Proof,
    PublicKey,
    Size,
    Timestamp,
} from '../../../../storage/limitStorage/limitStorage.js';
import { type EvoluRequestSchema } from '../../../evoluValidatorCompiler.js';

const deleteProps = {
    proof: Proof,
    size: Size,
    timestamp: Timestamp,
    publicKey: PublicKey,
    ownerId: OwnerId,
};

export const deleteEvoluSchema: ObjectType<typeof deleteProps> = object(deleteProps);

export const deleteRequestSchema: EvoluRequestSchema<typeof deleteEvoluSchema> = {
    schema: {
        body: {
            evoluSchema: deleteEvoluSchema,
        },
    },
};
