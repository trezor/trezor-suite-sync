import { FastifyReply, FastifyRequest } from 'fastify';
import type { FromSchema } from 'json-schema-to-ts';

import { OwnerId } from '@evolu/common';

import { storageAddOperation, type StorageAddDeps } from './storageAddOperation.js';
import { storageAddEvoluSchema, storageAddRequestSchema } from './storageAddSchema.js';
import { exhaustive } from '../../../../exhaustive.js';

type OwnerIdParseResult =
    | { ok: true; value: OwnerId }
    | { ok: false; error: unknown };

const parseOwnerId = (value: string): OwnerIdParseResult => {
    if (value === '0') {
        return { ok: true, value: value as OwnerId };
    }

    const result = OwnerId.from(value);

    if (!result.ok) {
        return { ok: false, error: result.error };
    }

    return { ok: true, value: result.value };
};

type StorageAddRequest = FastifyRequest<{
    Body: FromSchema<typeof storageAddRequestSchema.schema.body>;
}>;

export const storageAddHandler = (deps: StorageAddDeps) => async (
    request: StorageAddRequest,
    reply: FastifyReply,
) => {
    const validationResult = storageAddEvoluSchema.from(request.body);

    if (!validationResult.ok) {
        return reply.code(400).send({ error: validationResult.error });
    }

    const { ownerId, ...rest } = validationResult.value;
    const ownerIdResult = parseOwnerId(ownerId);

    if (!ownerIdResult.ok) {
        return reply.code(400).send({ error: ownerIdResult.error });
    }

    const operationResult = await storageAddOperation(deps, {
        ...rest,
        ownerId: ownerIdResult.value,
    });

    if (!operationResult.ok) {
        const { type } = operationResult.error;

        switch (type) {
            case 'SqliteError':
            case 'ConsistencyError':
                console.error(operationResult.error);

                return reply.code(500).send({ error: type });

            case 'ChallengeValidationFailed':
            case 'ProofValidationFailed':
            case 'NoStorageAllowance':
                return reply.code(400).send({ error: type });

            default:
                return exhaustive(type);
        }
    }

    return reply.code(200).send({
        publicKeyUnspentSpace: operationResult.value.publicKeyUnspentSpace,
        ownerTotalSpace: operationResult.value.ownerTotalSpace,
    });
};

