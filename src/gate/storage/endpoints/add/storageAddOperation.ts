import { err, ok, type Result } from '@evolu/common';
import { createVerify, webcrypto as nodeWebcrypto } from 'crypto';

import type { ChallengeStorage } from '../../../../storage/challengeStorage/challengeStorage.js';
import { Challenge, SessionId } from '../../../../storage/challengeStorage/challengeStorage.js';
import type { LimitStorage } from '../../../../storage/limitStorage/limitStorage.js';
import { OwnerId } from '@evolu/common';
import { Proof, PublicKey, Size } from '../../../../storage/limitStorage/limitStorage.js';

type StorageAddError =
    | { type: 'ChallengeValidationFailed' }
    | { type: 'ProofValidationFailed' }
    | { type: 'NoStorageAllowance' }
    | { type: 'SqliteError' }
    | { type: 'ConsistencyError' };

type VerifyProofFn = (publicKey: PublicKey, data: Buffer, proof: Proof) => Promise<boolean>;

export type StorageAddDeps = {
    limitStorage: Pick<LimitStorage, 'assignSpaceToOwner'>;
    challengeStorage: ChallengeStorage;
    verifySignature?: VerifyProofFn;
};

export type StorageAddInput = {
    publicKey: PublicKey;
    ownerId: OwnerId;
    size: Size;
    challenge: Challenge;
    sessionId: SessionId;
    proof: Proof;
};

export type StorageAddOutput = {
    publicKeyUnspentSpace: number;
    ownerTotalSpace: number | null;
};

const prefixBuffer = Buffer.from('EvoluAddSpaceToOwnerV1:');

const getChunkSize = (length: number): Buffer => {
    const buffer = Buffer.allocUnsafe(2);
    buffer.writeUInt16BE(length, 0);
    return buffer;
};

const numberToBuffer = (num: number): Buffer => {
    const buffer = Buffer.allocUnsafe(4);
    buffer.writeUInt32BE(num, 0);
    return buffer;
};

const toBuffer = (value: string): Buffer =>
    /^[0-9a-fA-F]+$/.test(value) && value.length % 2 === 0
        ? Buffer.from(value, 'hex')
        : Buffer.from(value, 'utf8');

const encodeSignedPayload = ({
    publicKey,
    ownerId,
    size,
    challenge,
}: Pick<StorageAddInput, 'publicKey' | 'ownerId' | 'size' | 'challenge'>): Buffer => {
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
        getChunkSize(sizeBuffer.length),
        sizeBuffer,
        getChunkSize(challengeBuffer.length),
        challengeBuffer,
    ]);
};

const defaultVerifySignature: VerifyProofFn = async (
    publicKey: PublicKey,
    data: Buffer,
    proof: Proof,
): Promise<boolean> => {
    const rawKey = Buffer.from(publicKey, 'hex');
    const signature = Buffer.from(proof, 'hex');

    try {
        if (rawKey.length === 65) {
            const signer = createVerify('sha256');
            signer.update(data);

            const subtle = nodeWebcrypto?.subtle ?? globalThis.crypto?.subtle;

            if (!subtle) {
                return false;
            }

            const ecKey = await subtle.importKey(
                'raw',
                rawKey,
                { name: 'ECDSA', namedCurve: 'P-256' },
                true,
                ['verify'],
            );

            const spki = await subtle.exportKey('spki', ecKey);
            const pem = `-----BEGIN PUBLIC KEY-----\n${Buffer.from(spki).toString('base64')}\n-----END PUBLIC KEY-----`;

            return signer.verify({ key: pem }, signature);
        }

        if (rawKey.length === 32) {
            const subtle = nodeWebcrypto?.subtle ?? globalThis.crypto?.subtle;

            if (!subtle) {
                return false;
            }

            const edKey = await subtle.importKey('raw', rawKey, { name: 'Ed25519' }, true, [
                'verify',
            ]);

            return subtle.verify({ name: 'Ed25519' }, edKey, signature, data);
        }

        return false;
    } catch {
        return false;
    }
};

export const storageAddOperation = async (
    deps: StorageAddDeps,
    input: StorageAddInput,
): Promise<Result<StorageAddOutput, StorageAddError>> => {
    const { challengeStorage, limitStorage } = deps;
    const { publicKey, ownerId, size, challenge, sessionId, proof } = input;

    const challengeResult = challengeStorage.validateAndConsumeChallenge(sessionId, challenge);

    if (!challengeResult.ok) {
        return err(challengeResult.error);
    }

    if (!challengeResult.value) {
        return err({ type: 'ChallengeValidationFailed' });
    }

    const payload = encodeSignedPayload({ publicKey, ownerId, size, challenge });
    const verifyProof = deps.verifySignature ?? defaultVerifySignature;
    const isProofValid = await verifyProof(publicKey, payload, proof);

    if (!isProofValid) {
        return err({ type: 'ProofValidationFailed' });
    }

    const assignResult = limitStorage.assignSpaceToOwner({ publicKey, ownerId, size });

    if (!assignResult.ok) {
        if (assignResult.error.type === 'NoStorageAllowance') {
            return err({ type: 'NoStorageAllowance' });
        }

        if (assignResult.error.type === 'ConsistencyError') {
            return err({ type: 'ConsistencyError' });
        }

        return err(assignResult.error);
    }

    return ok({
        publicKeyUnspentSpace: assignResult.value.publicKeyLimits.unspendStorageSize,
        ownerTotalSpace: assignResult.value.ownerStorageLimit,
    } satisfies StorageAddOutput);
};

