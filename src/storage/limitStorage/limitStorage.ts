import { Number, type Sqlite, String, brand, ok } from '@evolu/common';

import { type AddLimitToPubkeyParams, addLimitToPubkey } from './methods/addLimitToPubkey.js';
import {
    type AssignSpaceToOwnerParams,
    assignSpaceToOwner,
} from './methods/assignSpaceToOwner.js';
import { type GetLimitsForOwnerParams, getLimitsForOwner } from './methods/getLimitsForOwner.js';
import { type GetLimitsForPubkey, getLimitsForPubkey } from './methods/getLimitsForPubkey.js';
import {
    type TransferSpaceLimitToOwnerParams,
    transferSpaceLimitToOwner,
} from './methods/transferSpaceLimitToOwner.js';
import {
    createOwnerLimitTableQueryIfNotExists,
    createPubkeyLimitTableQueryIfNotExists,
} from './tables.js';
import { UnwrapOk } from '../../types.js';

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
    sqlite: Sqlite;
};

export const createLimitStorage = ({ sqlite }: CreateLimitStorageDependencies) => {
    const result1 = sqlite.exec(createPubkeyLimitTableQueryIfNotExists);

    if (!result1.ok) {
        return result1;
    }

    const result2 = sqlite.exec(createOwnerLimitTableQueryIfNotExists);

    if (!result2.ok) {
        return result2;
    }

    return ok({
        addLimitToPubkey: ({ publicKey, size }: Omit<AddLimitToPubkeyParams, 'sqlite'>) =>
            addLimitToPubkey({ sqlite, publicKey, size }),
        getLimitForPubkey: ({ publicKey }: Omit<GetLimitsForPubkey, 'sqlite'>) =>
            getLimitsForPubkey({ sqlite, publicKey }),
        getLimitForOwner: ({ ownerId }: Omit<GetLimitsForOwnerParams, 'sqlite'>) =>
            getLimitsForOwner({ sqlite, ownerId }),
        transferSpaceLimitToOwner: ({
            ownerId,
            publicKey,
            size,
        }: Omit<TransferSpaceLimitToOwnerParams, 'sqlite'>) =>
            transferSpaceLimitToOwner({ sqlite, ownerId, publicKey, size }),
        assignSpaceToOwner: ({
            ownerId,
            publicKey,
            size,
        }: Omit<AssignSpaceToOwnerParams, 'sqlite'>) =>
            assignSpaceToOwner({ sqlite, ownerId, publicKey, size }),
    });
};

export type LimitStorage = UnwrapOk<ReturnType<typeof createLimitStorage>>;
