import { askEvoluSchema } from './storageAskSchema.js';
import { EndpointHandler } from '../../../../EndpointHandler.js';
import { exhaustive } from '../../../../exhaustive.js';
import { GetLimitsForOwnerDep } from '../../../../storage/limitStorage/methods/createGetLimitsForOwner.js';
import { GetLimitsForPubkeyDep } from '../../../../storage/limitStorage/methods/createGetLimitsForPubkey.js';

export type AskHandlerDeps = GetLimitsForOwnerDep & GetLimitsForPubkeyDep;

export type StorageAskHandler = EndpointHandler<{
    Body: typeof askEvoluSchema.Type;
}>;

export const createStorageAskHandler =
    (deps: AskHandlerDeps): StorageAskHandler =>
    async (request, reply) => {
        const { ownerId, publicKey } = request.body;

        if (ownerId !== undefined) {
            const result = await deps.getLimitsForOwner({ ownerId });

            if (!result.ok) {
                const { type } = result.error;

                switch (type) {
                    case 'DatabaseError':
                        console.error(result.error);

                        return reply.code(500).send({ error: 'Internal server error' });

                    default:
                        return exhaustive(type);
                }
            }

            if (result.value === null) {
                return reply.code(404).send({ error: 'OwnerNotFound' });
            }

            return reply.code(200).send({ totalSpace: result.value });
        }

        if (publicKey !== undefined) {
            const result = await deps.getLimitsForPubkey({ publicKey });

            if (!result.ok) {
                const { type } = result.error;

                switch (type) {
                    case 'DatabaseError':
                        console.error(result.error);

                        return reply.code(500).send({ error: 'Internal server error' });

                    default:
                        return exhaustive(type);
                }
            }

            if (result.value === null) {
                return reply.code(404).send({ error: 'Public key not found' });
            }

            return reply.code(200).send({
                totalSpace: result.value.totalStorageSize,
                unspentSpace: result.value.unspendStorageSize,
            });
        }

        return reply.code(400).send({ error: 'Either ownerId or publicKey is required' });
    };
