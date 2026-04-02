import { FastifyRequest } from 'fastify';

import { askEvoluSchema } from './storageAskSchema.js';
import { EndpointHandler } from '../../../../EndpointHandler.js';
import { exhaustive } from '../../../../exhaustive.js';
import { GetLimitsForOwnerDep } from '../../../../storage/limitStorage/methods/createGetLimitsForOwner.js';
import { GetLimitsForPubkeyDep } from '../../../../storage/limitStorage/methods/createGetLimitsForPubkey.js';

/**
 * In legacy versions, when an owner or public key was not found, we returned a 404 status code.
 * That is changed now and we return simply null, but this is needed for backwards compatibility.
 */
export const LEGACY_404_STATUS_CODE_BEHAVIOR_VERSIONS: string[] = [
    '26.3.3',
    '26.3.2',
    '26.3.1',
    '26.3.0',
    '26.2.3',
    '26.2.2',
    '26.2.1',
    '26.2.0',
];

const useNewBehavior = (request: FastifyRequest): boolean => {
    const suiteVersion = request.headers['suite-version'];

    if (typeof suiteVersion !== 'string' || suiteVersion === '') {
        return false;
    }

    return !LEGACY_404_STATUS_CODE_BEHAVIOR_VERSIONS.includes(suiteVersion);
};

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
                if (useNewBehavior(request)) {
                    return reply.code(200).send({ status: 'NoQuota' });
                }

                return reply.code(404).send({ error: 'OwnerNotFound' });
            }

            return reply.code(200).send({ status: 'Allocated', totalSpace: result.value });
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
                if (useNewBehavior(request)) {
                    return reply.code(200).send({ status: 'NoQuota' });
                }

                return reply.code(404).send({ error: 'Public key not found' });
            }

            return reply.code(200).send({
                status: 'Allocated',
                totalSpace: result.value.totalStorageSize,
                unspentSpace: result.value.unspentStorageSize,
            });
        }

        return reply.code(400).send({ error: 'Either ownerId or publicKey is required' });
    };
