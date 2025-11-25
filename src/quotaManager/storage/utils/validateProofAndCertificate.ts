import { OwnerId, err, ok } from '@evolu/common';
import { MessagesSchema as PROTO } from '@trezor/protobuf';

import {
    getDeviceAuthenticityBlacklistConfig,
    getDeviceAuthenticityConfig,
    verifyAuthenticityProof,
} from './deviceAuthenticationWrapper.js';
import { getChunkSize, hexToBuffer, numberToBuffer } from './utils.js';
import { Challenge } from '../../../storage/challengeStorage/challengeStorage.js';
import { Proof, PublicKey, Size } from '../../../storage/limitStorage/limitStorage.js';
import { Result } from '../../types.js';

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
        const [config, blacklistConfig] = await Promise.all([
            getDeviceAuthenticityConfig(),
            getDeviceAuthenticityBlacklistConfig(),
        ]);

        const payload = Buffer.concat(payloadChunks);

        const authResult = await verifyAuthenticityProof({
            challenge: payload,
            deviceModel: deviceModel as keyof typeof PROTO.DeviceModelInternal,
            certificates: [certificateChain.deviceCert, certificateChain.caCert],
            signature: proof,
            config,
            blacklistConfig,
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

export const validateProofAndCertificate = async (
    proof: Proof,
    certificateChain: { deviceCert: string; caCert: string },
    publicKey: PublicKey,
    challenge: Challenge,
    size: Size,
    deviceModel: string,
): Promise<Result<boolean, 'ProofValidationFailed' | 'CertificateValidationFailed'>> => {
    const prefix = Buffer.from('EvoluSignRegistrationRequestV1:');
    const publicKeyBuffer = hexToBuffer(publicKey.toString());
    const challengeBuffer = hexToBuffer(challenge.toString());
    const sizeBuffer = numberToBuffer(Number(size));

    const payloadChunks = [
        getChunkSize(prefix.length),
        prefix,
        getChunkSize(publicKeyBuffer.length),
        publicKeyBuffer,
        getChunkSize(challengeBuffer.length),
        challengeBuffer,
        getChunkSize(sizeBuffer.length),
        sizeBuffer,
    ];

    return await validateDevicePayload({ proof, certificateChain, deviceModel, payloadChunks });
};

export const validateProofAndCertificateForAdd = async (
    proof: Proof,
    certificateChain: { deviceCert: string; caCert: string },
    publicKey: PublicKey,
    challenge: Challenge,
    size: Size,
    ownerId: OwnerId,
    deviceModel: string,
): Promise<Result<boolean, 'ProofValidationFailed' | 'CertificateValidationFailed'>> => {
    const prefix = Buffer.from('EvoluAddSpaceToOwnerV1:');
    const publicKeyBuffer = hexToBuffer(publicKey.toString());
    const ownerIdBuffer = Buffer.from(ownerId, 'utf8');
    const challengeBuffer = hexToBuffer(challenge.toString());
    const sizeBuffer = numberToBuffer(Number(size));

    const payloadChunks = [
        getChunkSize(prefix.length),
        prefix,
        getChunkSize(publicKeyBuffer.length),
        publicKeyBuffer,
        getChunkSize(ownerIdBuffer.length),
        ownerIdBuffer,
        getChunkSize(challengeBuffer.length),
        challengeBuffer,
        getChunkSize(sizeBuffer.length),
        sizeBuffer,
    ];

    return await validateDevicePayload({ proof, certificateChain, deviceModel, payloadChunks });
};
