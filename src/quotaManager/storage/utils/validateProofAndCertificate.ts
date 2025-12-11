import { OwnerId, err, ok } from '@evolu/common';
import {
    deviceAuthenticityBlacklistConfig,
    deviceAuthenticityConfig,
    verifyAuthenticityProof,
} from '@trezor/device-authenticity';
import { MessagesSchema as PROTO } from '@trezor/protobuf';

import { getChunkSize, hexToBuffer, numberToBuffer } from './utils.js';
import { Challenge } from '../../../storage/challengeStorage/challengeStorage.js';
import { Proof, PublicKey, Size } from '../../../storage/limitStorage/limitStorage.js';
import { Result } from '../../types.js';

const isDev = process.env.NODE_ENV !== 'production';

type ValidatePayloadParams = {
    proof: Proof;
    certificateChain: { deviceCert: string; caCert: string };
    deviceModel: string;
    payloadChunks: Buffer[];
};

const validateDevicePayload = async ({
    proof,
    certificateChain,
    deviceModel,
    payloadChunks,
}: ValidatePayloadParams): Promise<
    Result<boolean, 'ProofValidationFailed' | 'CertificateValidationFailed'>
> => {
    try {
        const payload = Buffer.concat(payloadChunks);

        const authResult = await verifyAuthenticityProof({
            challenge: payload,
            deviceModel: deviceModel as keyof typeof PROTO.DeviceModelInternal,
            certificates: [certificateChain.deviceCert, certificateChain.caCert],
            signature: proof,
            allowDebugKeys: isDev,
            config: deviceAuthenticityConfig,
            blacklistConfig: deviceAuthenticityBlacklistConfig,
        });

        if (!authResult.valid) {
            if (
                authResult.error === 'INVALID_DEVICE_CERTIFICATE' ||
                authResult.error === 'ROOT_PUBKEY_NOT_FOUND' ||
                authResult.error === 'CA_PUBKEY_BLACKLISTED' ||
                authResult.error === 'INVALID_DEVICE_MODEL'
            ) {
                return err('CertificateValidationFailed');
            }

            return err('ProofValidationFailed');
        }

        return ok(true);
    } catch (error) {
        if (
            error instanceof Error &&
            (error.message.includes('certificate') || error.message.includes('parse'))
        ) {
            return err('CertificateValidationFailed');
        }

        return err('ProofValidationFailed');
    }
};

type ValidateProofParams = {
    proof: Proof;
    certificateChain: { deviceCert: string; caCert: string };
    publicKey: PublicKey;
    challenge: Challenge;
    size: Size;
    deviceModel: string;
    prefix: string;
    ownerId?: OwnerId;
};

const validateProofAndCertificateInternal = async ({
    proof,
    certificateChain,
    publicKey,
    challenge,
    size,
    deviceModel,
    prefix,
    ownerId,
}: ValidateProofParams): Promise<
    Result<boolean, 'ProofValidationFailed' | 'CertificateValidationFailed'>
> => {
    const prefixBuffer = Buffer.from(prefix);
    const publicKeyBuffer = hexToBuffer(publicKey.toString());
    const challengeBuffer = hexToBuffer(challenge.toString());
    const sizeBuffer = numberToBuffer(Number(size));

    const payloadChunks = [
        getChunkSize(prefixBuffer.length),
        prefixBuffer,
        getChunkSize(publicKeyBuffer.length),
        publicKeyBuffer,
    ];

    if (ownerId !== undefined) {
        const ownerIdBuffer = Buffer.from(ownerId, 'utf8');
        payloadChunks.push(getChunkSize(ownerIdBuffer.length), ownerIdBuffer);
    }

    payloadChunks.push(
        getChunkSize(challengeBuffer.length),
        challengeBuffer,
        getChunkSize(sizeBuffer.length),
        sizeBuffer,
    );

    return await validateDevicePayload({ proof, certificateChain, deviceModel, payloadChunks });
};

export const validateProofAndCertificate = (
    proof: Proof,
    certificateChain: { deviceCert: string; caCert: string },
    publicKey: PublicKey,
    challenge: Challenge,
    size: Size,
    deviceModel: string,
): Promise<Result<boolean, 'ProofValidationFailed' | 'CertificateValidationFailed'>> =>
    validateProofAndCertificateInternal({
        proof,
        certificateChain,
        publicKey,
        challenge,
        size,
        deviceModel,
        prefix: 'EvoluSignRegistrationRequestV1:',
    });

export const validateProofAndCertificateForAdd = (
    proof: Proof,
    certificateChain: { deviceCert: string; caCert: string },
    publicKey: PublicKey,
    challenge: Challenge,
    size: Size,
    ownerId: OwnerId,
    deviceModel: string,
): Promise<Result<boolean, 'ProofValidationFailed' | 'CertificateValidationFailed'>> =>
    validateProofAndCertificateInternal({
        proof,
        certificateChain,
        publicKey,
        challenge,
        size,
        deviceModel,
        prefix: 'EvoluAddSpaceToOwnerV1:',
        ownerId,
    });
