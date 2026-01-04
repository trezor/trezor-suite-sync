import { OwnerId, err, ok } from '@evolu/common';
import { verifySignatureP256 } from '@trezor/device-authenticity';
import { MessagesSchema as PROTO } from '@trezor/protobuf';

import type { ChallengeStorage } from '../../../../storage/challengeStorage/challengeStorage.js';
import { Challenge, SessionId } from '../../../../storage/challengeStorage/challengeStorage.js';
import type { LimitStorage } from '../../../../storage/limitStorage/limitStorage.js';
import { Proof, PublicKey, Size } from '../../../../storage/limitStorage/limitStorage.js';
import { OWNER_ID_BURN } from '../../../../storage/limitStorage/methods/assignSpaceToOwner.js';
import { Result } from '../../../types.js';
import { rawToDer } from '../../utils/rawToDer.js';
import { getChunkSize } from '../../utils/utils.js';

type OwnerIdParseResult = { ok: true; value: OwnerId } | { ok: false; error: unknown };

const ADD_OPERATION_PROOF_HEADER = 'EvoluAddSpaceToOwnerV1';

export const parseOwnerId = (value: string): OwnerIdParseResult => {
    if (value === OWNER_ID_BURN) {
        return { ok: true, value: OWNER_ID_BURN };
    }

    const result = OwnerId.from(value);

    if (!result.ok) {
        return { ok: false, error: result.error };
    }

    return { ok: true, value: result.value };
};

type StorageAddError =
    | 'ChallengeValidationFailed'
    | 'ProofValidationFailed'
    | 'CertificateValidationFailed'
    | 'NoStorageAllowance'
    | 'SqliteError'
    | 'ConsistencyError';

export type StorageAddDeps = {
    limitStorage: Pick<LimitStorage, 'assignSpaceToOwner'>;
    challengeStorage: ChallengeStorage;
};

export type StorageAddInput = {
    publicKey: PublicKey;
    ownerId: string;
    size: Size;
    challenge: Challenge;
    sessionId: SessionId;
    proof: Proof;
    deviceModel: keyof typeof PROTO.DeviceModelInternal;
};

export type StorageAddInputParsed = Omit<StorageAddInput, 'ownerId'> & {
    ownerId: OwnerId;
};

export type StorageAddOutput = {
    publicKeyUnspentSpace: number;
    ownerTotalSpace: number | null;
};

export const storageAddOperation = async (
    deps: StorageAddDeps,
    input: StorageAddInputParsed,
): Promise<Result<StorageAddOutput, StorageAddError>> => {
    const { challengeStorage, limitStorage } = deps;
    const { publicKey, ownerId, size, challenge, sessionId, proof } = input;

    const challengeValidation = await challengeStorage.validateAndConsumeChallenge(
        sessionId,
        challenge,
    );

    if (!challengeValidation.ok) {
        return err('SqliteError');
    }

    if (!challengeValidation.value) {
        return err('ChallengeValidationFailed');
    }

    const sizeBuffer = Buffer.alloc(4, 0, 'binary');
    sizeBuffer.writeUInt32BE(size, 0);

    const bufferChunks = Buffer.concat([
        getChunkSize(Buffer.from(ADD_OPERATION_PROOF_HEADER, 'utf8').length),
        Buffer.from(ADD_OPERATION_PROOF_HEADER, 'utf8'),
        getChunkSize(Buffer.from(publicKey, 'hex').byteLength),
        Buffer.from(publicKey, 'hex'),
        getChunkSize(Buffer.from(ownerId, 'utf8').byteLength),
        Buffer.from(ownerId, 'utf8'),
        getChunkSize(Buffer.from(challenge, 'hex').byteLength),
        Buffer.from(challenge, 'hex'),
        getChunkSize(sizeBuffer.length),
        sizeBuffer,
    ]);

    const isSignatureValid = await verifySignatureP256(
        Buffer.from(publicKey, 'hex'),
        bufferChunks,
        rawToDer(Buffer.from(proof, 'hex')),
    );

    if (!isSignatureValid) {
        return err('ProofValidationFailed');
    }

    const assignResult = await limitStorage.assignSpaceToOwner({ publicKey, ownerId, size });

    if (!assignResult.ok) {
        if (assignResult.error.type === 'NoStorageAllowance') {
            return err('NoStorageAllowance');
        }

        if (assignResult.error.type === 'ConsistencyError') {
            return err('ConsistencyError');
        }

        return err('SqliteError');
    }

    return ok({
        publicKeyUnspentSpace: assignResult.value.publicKeyLimits.unspendStorageSize,
        ownerTotalSpace: assignResult.value.ownerStorageLimit,
    } satisfies StorageAddOutput);
};
