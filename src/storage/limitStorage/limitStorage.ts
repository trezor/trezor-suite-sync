import { Number, PositiveInt, String, brand } from '@evolu/common';

import { AppDatabaseDep } from '../posgres/createPostgreSql.js';
import { AddLimitToPubkeyDep, createAddLimitToPubkey } from './methods/createAddLimitToPubkey.js';
import {
    AssignSpaceToOwnerDep,
    createAssignSpaceToOwner,
} from './methods/createAssignSpaceToOwner.js';
import {
    GetLimitsForOwnerDep,
    createGetLimitsForOwner,
} from './methods/createGetLimitsForOwner.js';
import {
    GetLimitsForPubkeyDep,
    createGetLimitsForPubkey,
} from './methods/createGetLimitsForPubkey.js';
import {
    TransferSpaceFromDeviceToOwnerDep,
    createTransferSpaceFromDeviceToOwner,
} from './methods/createTransferSpaceFromDeviceToOwner.js';

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
export const Size = brand('Size', PositiveInt);
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

type CreateLimitStorageDeps = AppDatabaseDep;

export type LimitStorage = AddLimitToPubkeyDep &
    GetLimitsForPubkeyDep &
    GetLimitsForOwnerDep &
    TransferSpaceFromDeviceToOwnerDep &
    AssignSpaceToOwnerDep;

export type LimitStorageDep = { limitStorage: LimitStorage };

export const createLimitStorage = ({ db }: CreateLimitStorageDeps): LimitStorage => {
    const getLimitsForPubkey = createGetLimitsForPubkey({ db });
    const addLimitToPubkey = createAddLimitToPubkey({ db, getLimitsForPubkey });
    const getLimitsForOwner = createGetLimitsForOwner({ db });
    const transferSpaceFromDeviceToOwner = createTransferSpaceFromDeviceToOwner({
        db,
        getLimitsForPubkey,
        getLimitsForOwner,
    });
    const assignSpaceToOwner = createAssignSpaceToOwner({
        db,
        getLimitsForPubkey,
        getLimitsForOwner,
    });

    return {
        addLimitToPubkey,
        getLimitsForPubkey,
        getLimitsForOwner,
        transferSpaceFromDeviceToOwner,
        assignSpaceToOwner,
    };
};
