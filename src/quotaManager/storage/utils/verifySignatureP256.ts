import { VerifySignature } from '@trezor/device-authenticity';
import * as crypto from 'crypto';

const getSubtleCrypto = (): crypto.webcrypto.SubtleCrypto => {
    const nodeCrypto = crypto.webcrypto;
    if (!nodeCrypto?.subtle) {
        throw new Error('SubtleCrypto not supported');
    }

    return nodeCrypto.subtle;
};

export const verifySignatureP256: VerifySignature = async (rawKey, data, signature) => {
    const signer = crypto.createVerify('sha256');
    signer.update(Buffer.from(data));

    const SubtleCrypto = getSubtleCrypto();

    try {
        // get ECDSA P-256 (secp256r1) key from RAW key
        const ecPubKey = await SubtleCrypto.importKey(
            'raw',
            rawKey,
            { name: 'ECDSA', namedCurve: 'P-256' },
            true,
            ['verify'],
        );

        // export ECDSA key as spki
        const spkiPubKey = await SubtleCrypto.exportKey('spki', ecPubKey);

        // create PEM from spki
        const key = `-----BEGIN PUBLIC KEY-----\n${Buffer.from(spkiPubKey).toString(
            'base64',
        )}\n-----END PUBLIC KEY-----`;

        // verify using PEM key
        return signer.verify({ key }, Buffer.from(signature));
    } catch {
        // invalid inputs shall be considered unsuccessful verification, rather than runtime error
        // (e.g. calling this with a P-256 signature and an Ed25519 key)
        return false;
    }
};
