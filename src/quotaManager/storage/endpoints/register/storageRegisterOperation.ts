import { err, ok } from '@evolu/common';

import type { ChallengeStorage } from '../../../../storage/challengeStorage/challengeStorage.js';
import { Challenge, SessionId } from '../../../../storage/challengeStorage/challengeStorage.js';
import type { LimitStorage } from '../../../../storage/limitStorage/limitStorage.js';
import { Proof, PublicKey, Size } from '../../../../storage/limitStorage/limitStorage.js';
import { Result } from '../../../types.js';
import { validateProofAndCertificate } from '../../utils/validateProofAndCertificate.js';

type RegisterStorageError =
    | 'DatabaseError'
    | 'ConsistencyError'
    | 'ChallengeValidationFailed'
    | 'StorageLimitExceeded'
    | 'ProofValidationFailed'
    | 'CertificateValidationFailed';

export type RegisterOperationDeps = {
    limitStorage: Pick<LimitStorage, 'addLimitToPubkey' | 'getLimitForPubkey'>;
    challengeStorage: ChallengeStorage;
    maxStoragePerDevice?: number | undefined;
};

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
    unspendStorageSize: number;
};

export const storageRegisterOperation = async (
    deps: RegisterOperationDeps,
    input: RegisterOperationInput,
): Promise<Result<RegisterOperationOutput, RegisterStorageError>> => {
    const { publicKey, size, challenge, sessionId, proof, certificateChain, deviceModel } = input;

    const challengeValidation = await deps.challengeStorage.validateAndConsumeChallenge(
        sessionId,
        challenge,
    );

    if (!challengeValidation.ok) {
        return err('DatabaseError');
    }

    if (!challengeValidation.value) {
        return err('ChallengeValidationFailed');
    }

    const proofValidation = await validateProofAndCertificate(
        proof,
        certificateChain,
        publicKey,
        challenge,
        size,
        deviceModel,
    );

    if (!proofValidation.ok) {
        return err(proofValidation.error);
    }

    const currentLimits = await deps.limitStorage.getLimitForPubkey({ publicKey });

    if (!currentLimits.ok) {
        return err('DatabaseError');
    }

    const currentTotal = currentLimits.value?.totalStorageSize ?? (0 as Size);
    const newTotal = Number(currentTotal) + Number(size);

    if (deps.maxStoragePerDevice !== undefined && newTotal > deps.maxStoragePerDevice) {
        return err('StorageLimitExceeded');
    }

    const result = await deps.limitStorage.addLimitToPubkey({ publicKey, size });

    if (!result.ok) {
        return err(result.error.type);
    }

    return ok({
        totalStorageSize: result.value.totalStorageSize,
        unspendStorageSize: result.value.unspendStorageSize,
    });
};
