import { OwnerId } from '@evolu/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { type StorageAddDeps, storageAddOperation } from './storageAddOperation.js';
import { storageAddEvoluSchema } from './storageAddSchema.js';
import { exhaustive } from '../../../../exhaustive.js';

type OwnerIdParseResult = { ok: true; value: OwnerId } | { ok: false; error: unknown };

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
    Body: typeof storageAddEvoluSchema.Type;
}>;

export const storageAddHandler =
    (deps: StorageAddDeps) => async (request: StorageAddRequest, reply: FastifyReply) => {
        const { ownerId, ...rest } = request.body;
        const ownerIdResult = parseOwnerId(ownerId);

        if (!ownerIdResult.ok) {
            return reply.code(400).send({ error: ownerIdResult.error });
        }

        const result = await storageAddOperation(deps, {
            ...rest,
            ownerId: ownerIdResult.value,
        });

        if (!result.ok) {
            const { error } = result;

            switch (error) {
                case 'SqliteError':
                case 'ConsistencyError':
                    console.error(error);

                    return reply.code(500).send({ error });

                case 'ChallengeValidationFailed':
                case 'ProofValidationFailed':
                case 'CertificateValidationFailed':
                case 'NoStorageAllowance':
                    return reply.code(400).send({ error });

                default:
                    return exhaustive(error);
            }
        }

        return reply.code(200).send({
            publicKeyUnspentSpace: result.value.publicKeyUnspentSpace,
            ownerTotalSpace: result.value.ownerTotalSpace,
        });
    };
