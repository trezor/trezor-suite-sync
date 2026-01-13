import { InferOk, Number, String, brand, ok } from '@evolu/common';

import { type AddLimitToPubkeyParams, addLimitToPubkey } from './methods/addLimitToPubkey.js';
import { type AssignSpaceToOwnerParams, assignSpaceToOwner } from './methods/assignSpaceToOwner.js';
import { type GetLimitsForOwnerParams, getLimitsForOwner } from './methods/getLimitsForOwner.js';
import { type GetLimitsForPubkey, getLimitsForPubkey } from './methods/getLimitsForPubkey.js';
import {
    type TransferSpaceLimitToOwnerParams,
    transferSpaceFromDeviceToOwner,
} from './methods/transferSpaceFromDeviceToOwner.js';
import { LimitStorageDatabase } from './preparePostgreSql.js';
import { createOwnerLimitTableIfNotExists, createPubkeyLimitTableIfNotExists } from './tables.js';

/**
 * Uniquely identifying a Trezor device
 *
 * It is generated from a private key given by Trezor to Suite
 * (in firmware this is called the `delegated_identity_key`)
 *
 * - independent of passphrase
 * - constant over device wipe
 */
export const PublicKey = brand('PublicKey', String);
export type PublicKey = typeof PublicKey.Type;

/**
 * Size of the storage limits in bytes.
 */
export const Size = brand('Size', Number);
export type Size = typeof Size.Type;

/**
 * Timestamp in milliseconds
 */
export const Timestamp = brand('Timestamp', Number);
export type Timestamp = typeof Timestamp.Type;

/**
 * Proof is the signature of PublicKey|OwnerId|Size|Challenge
 * signed by a private key corresponding to the PublicKey.
 */
export const Proof = brand('Proof', String);
export type Proof = typeof Proof.Type;

type CreateLimitStorageDependencies = {
    db: LimitStorageDatabase;
};

export const createLimitStorage = async ({ db }: CreateLimitStorageDependencies) => {
    await createPubkeyLimitTableIfNotExists(db);
    await createOwnerLimitTableIfNotExists(db);

    return ok({
        addLimitToPubkey: async ({ publicKey, size }: Omit<AddLimitToPubkeyParams, 'db'>) =>
            await addLimitToPubkey({ db, publicKey, size }),
        getLimitForPubkey: async ({ publicKey }: Omit<GetLimitsForPubkey, 'db'>) =>
            await getLimitsForPubkey({ db, publicKey }),
        getLimitForOwner: async ({ ownerId }: Omit<GetLimitsForOwnerParams, 'db'>) =>
            await getLimitsForOwner({ db, ownerId }),
        transferSpaceLimitToOwner: async ({
            ownerId,
            publicKey,
            size,
        }: Omit<TransferSpaceLimitToOwnerParams, 'db'>) =>
            await transferSpaceFromDeviceToOwner({ db, ownerId, publicKey, size }),
        assignSpaceToOwner: async ({
            ownerId,
            publicKey,
            size,
        }: Omit<AssignSpaceToOwnerParams, 'db'>) =>
            await assignSpaceToOwner({ db, ownerId, publicKey, size }),
    });
};

export type LimitStorage = InferOk<Awaited<ReturnType<typeof createLimitStorage>>>;
