import {
    type StorageAddInputParsed,
    StorageAddOperationDep,
    parseOwnerId,
} from './createStorageAddOperation.js';
import { storageAddEvoluSchema } from './storageAddSchema.js';
import { EndpointHandler } from '../../../../EndpointHandler.js';
import { exhaustive } from '../../../../exhaustive.js';

export type StorageAddHandler = EndpointHandler<{
    Body: typeof storageAddEvoluSchema.Type;
}>;

export type StorageAddHandlerDeps = StorageAddOperationDep;

export type StorageAddHandlerDep = { storageAddHandler: StorageAddHandler };

export const createStorageAddHandler =
    (deps: StorageAddHandlerDeps): StorageAddHandler =>
    async (request, reply) => {
        const { ownerId, ...rest } = request.body;
        const ownerIdResult = parseOwnerId(ownerId);

        if (!ownerIdResult.ok) {
            return reply.code(400).send({ error: ownerIdResult.error });
        }

        const input = {
            ...rest,
            ownerId: ownerIdResult.value,
        } as StorageAddInputParsed;

        const result = await deps.storageAddOperation(input);

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
