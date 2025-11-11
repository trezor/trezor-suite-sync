import { type Result, err, ok } from '@evolu/common';
import { OwnerId } from '@evolu/common';

import type { ChallengeStorage } from '../../../../storage/challengeStorage/challengeStorage.js';
import { Challenge, SessionId } from '../../../../storage/challengeStorage/challengeStorage.js';
import type { LimitStorage } from '../../../../storage/limitStorage/limitStorage.js';
import { Proof, PublicKey, Size } from '../../../../storage/limitStorage/limitStorage.js';
import {
    type VerifyProofFn,
    encodeSignedPayload,
    verifySignature,
} from '../../utils/verifySignature.js';

type StorageAddError =
    | { type: 'ChallengeValidationFailed' }
    | { type: 'ProofValidationFailed' }
    | { type: 'NoStorageAllowance' }
    | { type: 'SqliteError' }
    | { type: 'ConsistencyError' };

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

export const storageAddOperation = async (
    deps: StorageAddDeps,
    input: StorageAddInput,
): Promise<Result<StorageAddOutput, StorageAddError>> => {
    const { challengeStorage, limitStorage } = deps;
    const { publicKey, ownerId, size, challenge, sessionId, proof } = input;


    const payload = encodeSignedPayload({ publicKey, ownerId, size, challenge });
    const verifyProof = deps.verifySignature ?? verifySignature;
    const isProofValid = await verifyProof(publicKey, payload, proof);

    if (!isProofValid) {
        return err({ type: 'ProofValidationFailed' });
    }

   
    const challengeResult = challengeStorage.validateAndConsumeChallenge(sessionId, challenge);

    if (!challengeResult.ok) {
        return err(challengeResult.error);
    }

    if (!challengeResult.value) {
        return err({ type: 'ChallengeValidationFailed' });
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
