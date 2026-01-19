import { err, ok } from '@evolu/common';
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

export const validateProofAndCertificate = async (
    proof: Proof,
    certificateChain: { deviceCert: string; caCert: string },
    publicKey: PublicKey,
    challenge: Challenge,
    size: Size,
    deviceModel: string,
): Promise<Result<boolean, 'ProofValidationFailed' | 'CertificateValidationFailed'>> => {
    try {
        const challengePrefix = Buffer.from('EvoluSignRegistrationRequestV1:');
        const publicKeyBuffer = hexToBuffer(publicKey.toString());
        const challengeBuffer = hexToBuffer(challenge.toString());
        const sizeBuffer = numberToBuffer(Number(size));

        const prefixedBuffer = Buffer.concat([
            getChunkSize(challengePrefix.length),
            challengePrefix,
            getChunkSize(publicKeyBuffer.length),
            publicKeyBuffer,
            getChunkSize(challengeBuffer.length),
            challengeBuffer,
            getChunkSize(sizeBuffer.length),
            sizeBuffer,
        ]);

        const authResult = await verifyAuthenticityProof({
            challenge: prefixedBuffer,
            deviceModel: deviceModel as keyof typeof PROTO.DeviceModelInternal,
            certificates: [certificateChain.deviceCert, certificateChain.caCert],
            signature: proof,
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
