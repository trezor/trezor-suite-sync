import { OwnerId } from '@evolu/common';
import { assert, describe, expect, it, vi } from 'vitest';

import { storageAddOperation } from './storageAddOperation.js';
import { getOrThrowTest } from '../../../../getOrThrowTest.js';
import {
    Challenge,
    SessionId,
    createChallengeStorage,
} from '../../../../storage/challengeStorage/challengeStorage.js';
import {
    Proof,
    PublicKey,
    Size,
    createLimitStorage,
} from '../../../../storage/limitStorage/limitStorage.js';
import { addLimitToPubkey } from '../../../../storage/limitStorage/methods/addLimitToPubkey.js';
import { prepareSqlite } from '../../../../storage/prepareSqlite.js';

const publicKey = getOrThrowTest(
    PublicKey.from(
        '049bbf06dad9ab5905e05471ce16d5222c89c2caa39f26267ac0747129885fbd441bcc7fa84de120a36755daf30a6f47e8c0d4bddc15036ed2a3447dfa7a1d3e88',
    ),
);
const ownerId = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJg6g'));
const burnOwnerId = '0' as OwnerId;
const size50 = getOrThrowTest(Size.from(50));
const size20 = getOrThrowTest(Size.from(20));
const challengeValue = getOrThrowTest(
    Challenge.from('29d0be0f3cb191c80d108359c64d22984a77ad8b99433814be31db0b6e9e7920'),
);
const sessionId = getOrThrowTest(SessionId.from('session-1'));
const proof = getOrThrowTest(Proof.from('deadbeef'));

const setupDeps = async () => {
    const sqlite = await prepareSqlite({ inMemory: true });
    assert(sqlite.ok);

    const limitStorageResult = createLimitStorage({ sqlite: sqlite.value });
    assert(limitStorageResult.ok);

    const challengeStorageResult = createChallengeStorage({ sqlite: sqlite.value });
    assert(challengeStorageResult.ok);

    addLimitToPubkey({ sqlite: sqlite.value, publicKey, size: size50 });

    const storeChallenge = () => {
        const storeChallengeResult = challengeStorageResult.value.storeChallenge(
            sessionId,
            challengeValue,
        );
        assert(storeChallengeResult.ok);
    };

    storeChallenge();

    return {
        deps: {
            limitStorage: limitStorageResult.value,
            challengeStorage: challengeStorageResult.value,
        },
        storeChallenge,
    } as const;
};

describe(storageAddOperation.name, () => {
    it('assigns space when proof and challenge are valid', async () => {
        const { deps } = await setupDeps();
        const verifySignature = vi.fn().mockResolvedValue(true);

        const result = await storageAddOperation(
            { ...deps, verifySignature },
            {
                publicKey,
                ownerId,
                size: size20,
                challenge: challengeValue,
                sessionId,
                proof,
            },
        );

        assert(result.ok);
        expect(result.value.publicKeyUnspentSpace).toBe(30);
        expect(result.value.ownerTotalSpace).toBe(20);

        expect(verifySignature).toHaveBeenCalledTimes(1);
    });

    it('allows burning space when ownerId equals zero', async () => {
        const { deps } = await setupDeps();
        const verifySignature = vi.fn().mockResolvedValue(true);

        const result = await storageAddOperation(
            { ...deps, verifySignature },
            {
                publicKey,
                ownerId: burnOwnerId,
                size: size20,
                challenge: challengeValue,
                sessionId,
                proof,
            },
        );

        assert(result.ok);
        expect(result.value.publicKeyUnspentSpace).toBe(30);
        expect(result.value.ownerTotalSpace).toBeNull();
    });

    it('fails when challenge is invalid', async () => {
        const { deps } = await setupDeps();
        const verifySignature = vi.fn().mockResolvedValue(true);

        const result = await storageAddOperation(
            { ...deps, verifySignature },
            {
                publicKey,
                ownerId,
                size: size20,
                challenge: challengeValue,
                sessionId,
                proof,
            },
        );

        assert(result.ok);

        const secondResult = await storageAddOperation(
            { ...deps, verifySignature },
            {
                publicKey,
                ownerId,
                size: size20,
                challenge: challengeValue,
                sessionId,
                proof,
            },
        );

        assert(!secondResult.ok);
        if (!secondResult.ok) {
            expect(secondResult.error.type).toBe('ChallengeValidationFailed');
        }
    });

    it('fails when proof verification fails', async () => {
        const { deps } = await setupDeps();
        const verifySignature = vi.fn().mockResolvedValue(false);

        const result = await storageAddOperation(
            { ...deps, verifySignature },
            {
                publicKey,
                ownerId,
                size: size20,
                challenge: challengeValue,
                sessionId,
                proof,
            },
        );

        assert(!result.ok);
        if (!result.ok) {
            expect(result.error.type).toBe('ProofValidationFailed');
        }
    });

    it('fails when there is insufficient unspent space', async () => {
        const { deps, storeChallenge } = await setupDeps();
        const verifySignature = vi.fn().mockResolvedValue(true);

        const result = await storageAddOperation(
            { ...deps, verifySignature },
            {
                publicKey,
                ownerId,
                size: size50,
                challenge: challengeValue,
                sessionId,
                proof,
            },
        );

        assert(result.ok);

        storeChallenge();

        const insufficientResult = await storageAddOperation(
            { ...deps, verifySignature },
            {
                publicKey,
                ownerId,
                size: size20,
                challenge: challengeValue,
                sessionId,
                proof,
            },
        );

        assert(!insufficientResult.ok);
        if (!insufficientResult.ok) {
            expect(insufficientResult.error.type).toBe('NoStorageAllowance');
        }
    });
});
