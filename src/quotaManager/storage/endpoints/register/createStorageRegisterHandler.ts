import { StorageRegisterOperationDep } from './createStorageRegisterOperation.js';
import { storageRegisterEvoluSchema } from './storageRegisterSchema.js';
import { EndpointHandler } from '../../../../EndpointHandler.js';
import { exhaustive } from '../../../../exhaustive.js';

export type StorageRegisterOperationDeps = StorageRegisterOperationDep;

export type StorageRegisterHandler = EndpointHandler<{
    Body: typeof storageRegisterEvoluSchema.Type;
}>;

export const createStorageRegisterHandler =
    (deps: StorageRegisterOperationDeps): StorageRegisterHandler =>
    async (request, reply) => {
        const {
            publicKey,
            size,
            challenge,
            sessionId,
            proof,
            certificateChain,
            deviceModel,
            rotationIndex,
        } = request.body;

        const result = await deps.storageRegisterOperation({
            publicKey,
            size,
            challenge,
            sessionId,
            proof,
            certificateChain,
            deviceModel,
            rotationIndex,
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
            unspentStorageSize: result.value.unspentStorageSize,
        });
    };
