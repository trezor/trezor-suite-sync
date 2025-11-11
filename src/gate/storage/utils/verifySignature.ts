import { OwnerId } from '@evolu/common';
import { createVerify } from 'crypto';

import { getChunkSize, numberToBuffer } from './utils.js';
import { Challenge } from '../../../storage/challengeStorage/challengeStorage.js';
import { Proof, PublicKey, Size } from '../../../storage/limitStorage/limitStorage.js';

const toBuffer = (value: string): Buffer =>
    /^[0-9a-fA-F]+$/.test(value) && value.length % 2 === 0
        ? Buffer.from(value, 'hex')
        : Buffer.from(value, 'utf8');

const prefixBuffer = Buffer.from('EvoluAddSpaceToOwnerV1:');

export const encodeSignedPayload = ({
    publicKey,
    ownerId,
    size,
    challenge,
}: {
    publicKey: PublicKey;
    ownerId: OwnerId;
    size: Size;
    challenge: Challenge;
}): Buffer => {
    const publicKeyBuffer = Buffer.from(publicKey, 'hex');
    const ownerIdBuffer = Buffer.from(ownerId, 'utf8');
    const sizeBuffer = numberToBuffer(Number(size));
    const challengeBuffer = toBuffer(challenge);

    return Buffer.concat([
        getChunkSize(prefixBuffer.length),
        prefixBuffer,
        getChunkSize(publicKeyBuffer.length),
        publicKeyBuffer,
        getChunkSize(ownerIdBuffer.length),
        ownerIdBuffer,
        getChunkSize(challengeBuffer.length),
        challengeBuffer,
        getChunkSize(sizeBuffer.length),
        sizeBuffer,
    ]);
};

export const verifySignatureP256 = async (
    rawKey: Buffer,
    data: Buffer,
    signature: Buffer,
): Promise<boolean> => {
    try {
        const signer = createVerify('sha256');
        signer.update(data);

        const { webcrypto } = await import('crypto');

        const ecPubKey = await webcrypto.subtle.importKey(
            'raw',
            rawKey,
            { name: 'ECDSA', namedCurve: 'P-256' },
            true,
            ['verify'],
        );

        const spkiPubKey = await webcrypto.subtle.exportKey('spki', ecPubKey);

        const key = `-----BEGIN PUBLIC KEY-----\n${Buffer.from(spkiPubKey).toString('base64')}\n-----END PUBLIC KEY-----`;

        return signer.verify({ key }, signature);
    } catch {
        return false;
    }
};

export const verifySignatureEd25519 = async (
    rawKey: Buffer,
    data: Buffer,
    signature: Buffer,
): Promise<boolean> => {
    try {
        const { webcrypto } = await import('crypto');

        const edPubKey = await webcrypto.subtle.importKey(
            'raw',
            rawKey,
            { name: 'Ed25519' },
            true,
            ['verify'],
        );

        return await webcrypto.subtle.verify({ name: 'Ed25519' }, edPubKey, signature, data);
    } catch {
        return false;
    }
};

export type VerifyProofFn = (publicKey: PublicKey, data: Buffer, proof: Proof) => Promise<boolean>;

export const verifySignature = async (
    publicKey: PublicKey,
    data: Buffer,
    proof: Proof,
): Promise<boolean> => {
    const rawKey = Buffer.from(publicKey, 'hex');
    const signature = Buffer.from(proof, 'hex');

    if (rawKey.length === 65) {
        return await verifySignatureP256(rawKey, data, signature);
    }

    if (rawKey.length === 32) {
        return await verifySignatureEd25519(rawKey, data, signature);
    }

    return false;
};
