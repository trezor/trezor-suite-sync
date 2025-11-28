import type { FastifyReply, FastifyRequest } from 'fastify';

import { RegisterOperationDeps, storageRegisterOperation } from './storageRegisterOperation.js';
import { storageRegisterEvoluSchema } from './storageRegisterSchema.js';
import { exhaustive } from '../../../../exhaustive.js';

type RegisterRequest = FastifyRequest<{
    Body: typeof storageRegisterEvoluSchema.Type;
}>;

export const storageRegisterHandler =
    (deps: RegisterOperationDeps) => async (request: RegisterRequest, reply: FastifyReply) => {
        const { publicKey, size, challenge, sessionId, proof, certificateChain, deviceModel } =
            request.body;

        const result = await storageRegisterOperation(deps, {
            publicKey,
            size,
            challenge,
            sessionId,
            proof,
            certificateChain,
            deviceModel,
        });

        if (!result.ok) {
            const { error } = result;

            switch (error) {
                case 'DatabaseError':
                case 'ConsistencyError':
                    console.error(error);

                    return reply.code(500).send({ error });

                case 'ChallengeValidationFailed':
                case 'StorageLimitExceeded':
                case 'ProofValidationFailed':
                case 'CertificateValidationFailed':
                    return reply.code(400).send({ error });

                default:
                    return exhaustive(error);
            }
        }

        return reply.code(200).send({
            totalStorageSize: result.value.totalStorageSize,
            unspendStorageSize: result.value.unspendStorageSize,
        });
    };
