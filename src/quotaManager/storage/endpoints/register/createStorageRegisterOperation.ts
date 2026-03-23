import { err, ok } from '@evolu/common';
import {
    deviceAuthenticityBlacklistConfig,
    deviceAuthenticityConfig,
    prepareDeviceAuthenticityData,
    verifyAuthenticityProof,
} from '@trezor/device-authenticity';
import { MessagesSchema as PROTO } from '@trezor/protobuf';

import { IS_DEV_SERVER } from '../../../../env.js';
import {
    Challenge,
    SessionId,
} from '../../../../storage/challengeStorage/createChallengeStorage.js';
import { ValidateAndConsumeChallengeDep } from '../../../../storage/challengeStorage/methods/createValidateAndConsumeChallenge.js';
import { Proof, PublicKey, Size } from '../../../../storage/limitStorage/limitStorage.js';
import { AddLimitToPubkeyDep } from '../../../../storage/limitStorage/methods/createAddLimitToPubkey.js';
import { GetLimitsForPubkeyDep } from '../../../../storage/limitStorage/methods/createGetLimitsForPubkey.js';
import { MAX_DEVICE_SIZE_QUOTA } from '../../../constants.js';
import { Result } from '../../../types.js';

type RegisterStorageError =
    | 'DatabaseError'
    | 'ConsistencyError'
    | 'ChallengeValidationFailed'
    | 'StorageLimitExceeded'
    | 'ProofValidationFailed'
    | 'CertificateValidationFailed';

const REGISTER_OPERATION_PROOF_HEADER = 'EvoluSignRegistrationRequestV1:';

export type RegisterOperationInput = {
    publicKey: PublicKey;
    size: Size;
    challenge: Challenge;
    sessionId: SessionId;
    proof: Proof;
    certificateChain: {
        deviceCert: string;
        caCert: string;
    };
    deviceModel: string;
};

export type RegisterOperationOutput = {
    totalStorageSize: number;
    unspentStorageSize: number;
};

export type RegisterOperationDeps = AddLimitToPubkeyDep &
    GetLimitsForPubkeyDep &
    ValidateAndConsumeChallengeDep;

export type StorageRegisterOperation = (
    input: RegisterOperationInput,
) => Promise<Result<RegisterOperationOutput, RegisterStorageError>>;

export type StorageRegisterOperationDep = { storageRegisterOperation: StorageRegisterOperation };

export const createStorageRegisterOperation =
    (deps: RegisterOperationDeps): StorageRegisterOperation =>
    async input => {
        const { publicKey, size, challenge, sessionId, proof, certificateChain, deviceModel } =
            input;

        const challengeValidation = await deps.validateAndConsumeChallenge({
            sessionId,
            challenge,
        });

        if (!challengeValidation.ok) {
            return err('DatabaseError');
        }

        if (!challengeValidation.value) {
            return err('ChallengeValidationFailed');
        }

        const sizeBuffer = Buffer.alloc(4);
        sizeBuffer.writeUInt32BE(size, 0);

        const bufferChunks = [
            Buffer.from(publicKey, 'hex'),
            Buffer.from(challenge, 'hex'),
            sizeBuffer,
        ];

        const data = prepareDeviceAuthenticityData({
            prefix: REGISTER_OPERATION_PROOF_HEADER,
            payload: bufferChunks,
        });
        const proofValidation = await verifyAuthenticityProof({
            certificates: [certificateChain.deviceCert, certificateChain.caCert],
            data,
            signature: proof,
            deviceModel: deviceModel as PROTO.DeviceModelInternal,
            config: deviceAuthenticityConfig,
            blacklistConfig: deviceAuthenticityBlacklistConfig,
            allowDebugKeys: IS_DEV_SERVER,
        });

        if (!proofValidation.valid) {
            if (
                proofValidation.error === 'INVALID_DEVICE_CERTIFICATE' ||
                proofValidation.error === 'ROOT_PUBKEY_NOT_FOUND' ||
                proofValidation.error === 'CA_PUBKEY_BLACKLISTED' ||
                proofValidation.error === 'INVALID_DEVICE_MODEL'
            ) {
                return err('CertificateValidationFailed');
            }

            return err('ProofValidationFailed');
        }

        const currentLimits = await deps.getLimitsForPubkey({ publicKey });

        if (!currentLimits.ok) {
            return err('DatabaseError');
        }

        const currentTotal = currentLimits.value?.totalStorageSize ?? (0 as Size);
        const newTotal = Number(currentTotal) + Number(size);

        if (MAX_DEVICE_SIZE_QUOTA !== undefined && newTotal > MAX_DEVICE_SIZE_QUOTA) {
            return err('StorageLimitExceeded');
        }

        const result = await deps.addLimitToPubkey({ publicKey, size });

        if (!result.ok) {
            return err(result.error.type);
        }

        return ok({
            totalStorageSize: result.value.totalStorageSize,
            unspentStorageSize: result.value.unspentStorageSize,
        });
    };
