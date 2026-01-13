import { deleteEvoluSchema } from './storageDeleteSchema.js';
import { EndpointHandler } from '../../../../EndpointHandler.js';
import { exhaustive } from '../../../../exhaustive.js';
import { TransferSpaceFromDeviceToOwnerDep } from '../../../../storage/limitStorage/methods/createTransferSpaceFromDeviceToOwner.js';

export type DeleteHandlerDeps = TransferSpaceFromDeviceToOwnerDep;

export type StorageDeleteHandler = EndpointHandler<{
    Body: typeof deleteEvoluSchema.Type;
}>;

export const createStorageDeleteHandler =
    (deps: DeleteHandlerDeps): StorageDeleteHandler =>
    async (request, reply) => {
        const { publicKey, ownerId, size } = request.body;

        const result = await deps.transferSpaceFromDeviceToOwner({
            publicKey,
            ownerId,
            size,
        });

        if (!result.ok) {
            const { type } = result.error;

            switch (type) {
                case 'DatabaseError':
                    console.error(result.error);

                    return reply.code(500).send({ error: 'Internal server error' });

                case 'NoStorageAllowance':
                    return reply.code(400).send({ error: type });

                default:
                    return exhaustive(type);
            }
        }

        return reply.code(200).send({
            storageLimit: result.value,
        });
    };
