import { OwnerId, err, ok } from '@evolu/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    StorageAddDeps,
    type StorageAddInput,
    storageAddOperation,
} from './storageAddOperation.js';
import { CA_CERT_OPTIGA, DEVICE_CERT_OPTIGA } from '../../../../../test/mocks/certificates.js';
import { consistencyError, noSpaceAllowanceErr } from '../../../../errors.js';
import { getOrThrowTest } from '../../../../getOrThrowTest.js';
import {
    Challenge,
    type ChallengeStorage,
    SessionId,
} from '../../../../storage/challengeStorage/challengeStorage.js';
import {
    type LimitStorage,
    Proof,
    PublicKey,
    Size,
} from '../../../../storage/limitStorage/limitStorage.js';
import { verifyAuthenticityProof } from '../../utils/deviceAuthenticationWrapper.js';

const { T2B1rootPubKeyOptiga } = vi.hoisted(() => ({
    T2B1rootPubKeyOptiga:
        '04626d58aca84f0fcb52ea63f0eb08de1067b8d406574a715d5e7928f4b67f113a00fb5c5918e74d2327311946c446b242c20fe7347482999bdc1e229b94e27d96',
}));

vi.mock('../../utils/deviceAuthenticationWrapper.ts', () => ({
    verifyAuthenticityProof: vi.fn().mockResolvedValue({
        valid: true,
        caPubKey: 'test-ca-pubkey',
        rootPubKey: T2B1rootPubKeyOptiga,
    }),
    getDeviceAuthenticityBlacklistConfig: vi.fn().mockResolvedValue({
        version: 1,
        blacklistedCaPubKeys: [],
        debug: {
            blacklistedCaPubKeys: [],
        },
    }),
    getDeviceAuthenticityConfig: vi.fn().mockResolvedValue({
        version: 1,
        T2B1: { rootPubKeysOptiga: [T2B1rootPubKeyOptiga] },
        T3B1: { rootPubKeysOptiga: [] },
        T3T1: { rootPubKeysOptiga: [] },
        T3W1: {
            rootPubKeysOptiga: [],
            rootPubKeysTropic: ['cd318dc8405ae4f4144e3284dcb7b0cb0f0c2195c2ca14a0f6fccd9104e32a4b'],
        },
    }),
}));

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
const certificateChain = {
    deviceCert: DEVICE_CERT_OPTIGA,
    caCert: CA_CERT_OPTIGA,
};
const deviceModel = 'T2B1';

const createMockInput = (overrides?: Partial<StorageAddInput>): StorageAddInput => ({
    publicKey,
    ownerId,
    size: size20,
    challenge: challengeValue,
    sessionId,
    proof,
    certificateChain,
    deviceModel,
    ...overrides,
});

const createMockDeps = (
    challengeStorage: ChallengeStorage,
    limitStorage: Pick<LimitStorage, 'assignSpaceToOwner'>,
    overrides?: Partial<StorageAddDeps>,
): StorageAddDeps => ({
    limitStorage,
    challengeStorage,
    ...overrides,
});

describe(storageAddOperation.name, () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(verifyAuthenticityProof).mockResolvedValue({
            valid: true,
            caPubKey: 'test-ca-pubkey',
            rootPubKey: T2B1rootPubKeyOptiga,
        });
    });

    it('assigns space when proof and challenge are valid', async () => {
        const challengeStorage: ChallengeStorage = {
            validateAndConsumeChallenge: () => ok(true),
            storeChallenge: () => ok(undefined),
            cleanupExpiredChallenges: () => ok(undefined),
        };

        const limitStorage: Pick<LimitStorage, 'assignSpaceToOwner'> = {
            assignSpaceToOwner: () =>
                ok({
                    publicKeyLimits: {
                        totalStorageSize: size50,
                        unspendStorageSize: 30 as Size,
                    },
                    ownerStorageLimit: 20 as Size,
                }),
        };

        const deps = createMockDeps(challengeStorage, limitStorage);

        const result = await storageAddOperation(deps, createMockInput());

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.publicKeyUnspentSpace).toBe(30);
            expect(result.value.ownerTotalSpace).toBe(20);
        }
    });

    it('allows burning space when ownerId equals zero', async () => {
        const challengeStorage: ChallengeStorage = {
            validateAndConsumeChallenge: () => ok(true),
            storeChallenge: () => ok(undefined),
            cleanupExpiredChallenges: () => ok(undefined),
        };

        const limitStorage: Pick<LimitStorage, 'assignSpaceToOwner'> = {
            assignSpaceToOwner: () =>
                ok({
                    publicKeyLimits: {
                        totalStorageSize: size50,
                        unspendStorageSize: 30 as Size,
                    },
                    ownerStorageLimit: null,
                }),
        };

        const deps = createMockDeps(challengeStorage, limitStorage);

        const result = await storageAddOperation(deps, createMockInput({ ownerId: burnOwnerId }));

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.publicKeyUnspentSpace).toBe(30);
            expect(result.value.ownerTotalSpace).toBeNull();
        }
    });

    it('returns ChallengeValidationFailed when challenge is invalid', async () => {
        const challengeStorage: ChallengeStorage = {
            validateAndConsumeChallenge: () => ok(false),
            storeChallenge: () => ok(undefined),
            cleanupExpiredChallenges: () => ok(undefined),
        };

        const limitStorage: Pick<LimitStorage, 'assignSpaceToOwner'> = {
            assignSpaceToOwner: () =>
                ok({
                    publicKeyLimits: {
                        totalStorageSize: size50,
                        unspendStorageSize: size50,
                    },
                    ownerStorageLimit: 20 as Size,
                }),
        };

        const deps = createMockDeps(challengeStorage, limitStorage);

        const result = await storageAddOperation(deps, createMockInput());

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('ChallengeValidationFailed');
        }
    });

    it('returns ChallengeValidationFailed when challenge is consumed', async () => {
        const challengeStorage: ChallengeStorage = (() => {
            const state = { hasBeenConsumed: false };

            return {
                validateAndConsumeChallenge: () => {
                    if (!state.hasBeenConsumed) {
                        state.hasBeenConsumed = true;

                        return ok(true);
                    }

                    return ok(false);
                },
                storeChallenge: () => ok(undefined),
                cleanupExpiredChallenges: () => ok(undefined),
            };
        })();

        const limitStorage: Pick<LimitStorage, 'assignSpaceToOwner'> = {
            assignSpaceToOwner: () =>
                ok({
                    publicKeyLimits: {
                        totalStorageSize: size50,
                        unspendStorageSize: 30 as Size,
                    },
                    ownerStorageLimit: 20 as Size,
                }),
        };

        const deps = createMockDeps(challengeStorage, limitStorage);

        const input = createMockInput();

        const result1 = await storageAddOperation(deps, input);
        expect(result1.ok).toBe(true);

        const result2 = await storageAddOperation(deps, input);
        expect(result2.ok).toBe(false);
        if (!result2.ok) {
            expect(result2.error).toBe('ChallengeValidationFailed');
        }
    });

    it('returns ProofValidationFailed when proof verification fails', async () => {
        vi.mocked(verifyAuthenticityProof).mockResolvedValue({
            valid: false,
            error: 'INVALID_DEVICE_SIGNATURE',
        });

        const challengeStorage: ChallengeStorage = {
            validateAndConsumeChallenge: () => ok(true),
            storeChallenge: () => ok(undefined),
            cleanupExpiredChallenges: () => ok(undefined),
        };

        const limitStorage: Pick<LimitStorage, 'assignSpaceToOwner'> = {
            assignSpaceToOwner: () =>
                ok({
                    publicKeyLimits: {
                        totalStorageSize: size50,
                        unspendStorageSize: size50,
                    },
                    ownerStorageLimit: 20 as Size,
                }),
        };

        const deps = createMockDeps(challengeStorage, limitStorage);

        const result = await storageAddOperation(deps, createMockInput());

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('ProofValidationFailed');
        }
    });

    it('returns NoStorageAllowance when there is insufficient unspent space', async () => {
        const challengeStorage: ChallengeStorage = {
            validateAndConsumeChallenge: () => ok(true),
            storeChallenge: () => ok(undefined),
            cleanupExpiredChallenges: () => ok(undefined),
        };

        const limitStorage: Pick<LimitStorage, 'assignSpaceToOwner'> = {
            assignSpaceToOwner: () => err(noSpaceAllowanceErr('Insufficient unspent space')),
        };

        const deps = createMockDeps(challengeStorage, limitStorage);

        const result = await storageAddOperation(deps, createMockInput());

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('NoStorageAllowance');
        }
    });

    it('returns ConsistencyError when limit storage returns consistency error', async () => {
        const challengeStorage: ChallengeStorage = {
            validateAndConsumeChallenge: () => ok(true),
            storeChallenge: () => ok(undefined),
            cleanupExpiredChallenges: () => ok(undefined),
        };

        const limitStorage: Pick<LimitStorage, 'assignSpaceToOwner'> = {
            assignSpaceToOwner: () => err(consistencyError('Public key limits disappeared')),
        };

        const deps = createMockDeps(challengeStorage, limitStorage);

        const result = await storageAddOperation(deps, createMockInput());

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('ConsistencyError');
        }
    });

    it('returns SqliteError when challenge storage returns error', async () => {
        const challengeStorage: ChallengeStorage = {
            validateAndConsumeChallenge: () =>
                err({ type: 'SqliteError', error: new Error('Test SQLite error') } as any),
            storeChallenge: () => ok(undefined),
            cleanupExpiredChallenges: () => ok(undefined),
        };

        const limitStorage: Pick<LimitStorage, 'assignSpaceToOwner'> = {
            assignSpaceToOwner: () =>
                ok({
                    publicKeyLimits: {
                        totalStorageSize: size50,
                        unspendStorageSize: size50,
                    },
                    ownerStorageLimit: 20 as Size,
                }),
        };

        const deps = createMockDeps(challengeStorage, limitStorage);

        const result = await storageAddOperation(deps, createMockInput());

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('SqliteError');
        }
    });
});
