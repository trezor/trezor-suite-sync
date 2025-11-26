import type { FastifyReply, FastifyRequest } from 'fastify';

import {
    type StorageAddDeps,
    type StorageAddInputParsed,
    parseOwnerId,
    storageAddOperation,
} from './storageAddOperation.js';
import { storageAddEvoluSchema } from './storageAddSchema.js';
import { exhaustive } from '../../../../exhaustive.js';

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
        } as StorageAddInputParsed);

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
