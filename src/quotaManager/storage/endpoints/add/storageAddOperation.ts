import { OwnerId, err, ok } from '@evolu/common';

import type { ChallengeStorage } from '../../../../storage/challengeStorage/challengeStorage.js';
import { Challenge, SessionId } from '../../../../storage/challengeStorage/challengeStorage.js';
import type { LimitStorage } from '../../../../storage/limitStorage/limitStorage.js';
import { Proof, PublicKey, Size } from '../../../../storage/limitStorage/limitStorage.js';
import { Result } from '../../../types.js';
import { validateProofAndCertificateForAdd } from '../../utils/validateProofAndCertificate.js';

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
    ownerId: OwnerId;
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

export type StorageAddOutput = {
    publicKeyUnspentSpace: number;
    ownerTotalSpace: number | null;
};

export const storageAddOperation = async (
    deps: StorageAddDeps,
    input: StorageAddInput,
): Promise<Result<StorageAddOutput, StorageAddError>> => {
    const { challengeStorage, limitStorage } = deps;
    const { publicKey, ownerId, size, challenge, sessionId, proof, certificateChain, deviceModel } =
        input;

    const challengeValidation = challengeStorage.validateAndConsumeChallenge(sessionId, challenge);

    if (!challengeValidation.ok) {
        return err('SqliteError');
    }

    if (!challengeValidation.value) {
        return err('ChallengeValidationFailed');
    }

    const proofValidation = await validateProofAndCertificateForAdd(
        proof,
        certificateChain,
        publicKey,
        challenge,
        size,
        ownerId,
        deviceModel,
    );

    if (!proofValidation.ok) {
        return err(proofValidation.error);
    }

    const assignResult = limitStorage.assignSpaceToOwner({ publicKey, ownerId, size });

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
