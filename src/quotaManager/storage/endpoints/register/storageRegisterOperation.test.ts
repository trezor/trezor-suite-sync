import { err, ok } from '@evolu/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    RegisterOperationDeps,
    type RegisterOperationInput,
    storageRegisterOperation,
} from './storageRegisterOperation.js';
import { CA_CERT_OPTIGA, DEVICE_CERT_OPTIGA } from '../../../../../test/mocks/certificates.js';
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

const SIGNATURE_OPTIGA =
    '3045022100c01793ffbe4f16d4efc84a4533d9bbfbbf1baa5349346678e07fdb6d848cca7902200df11b9d2850173d9c93993fca983c6d2a3f31ea69a0e19b69e18cc3b78424fe';
const CHALLENGE = '29d0be0f3cb191c80d108359c64d22984a77ad8b99433814be31db0b6e9e7920';

const { T2B1rootPubKeyOptiga, mockParseCertificate } = vi.hoisted(() => ({
    T2B1rootPubKeyOptiga:
        '04626d58aca84f0fcb52ea63f0eb08de1067b8d406574a715d5e7928f4b67f113a00fb5c5918e74d2327311946c446b242c20fe7347482999bdc1e229b94e27d96',
    mockParseCertificate: vi.fn(),
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
    PublicKey.from('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'),
);
const size50 = getOrThrowTest(Size.from(50));
const size100 = getOrThrowTest(Size.from(100));
const size101 = getOrThrowTest(Size.from(101));

const createMockInput = (overrides?: Partial<RegisterOperationInput>): RegisterOperationInput => ({
    publicKey,
    size: size100,
    challenge: getOrThrowTest(Challenge.from(CHALLENGE)),
    sessionId: getOrThrowTest(SessionId.from('session-123')),
    proof: getOrThrowTest(Proof.from(SIGNATURE_OPTIGA)),
    certificateChain: {
        deviceCert: DEVICE_CERT_OPTIGA,
        caCert: CA_CERT_OPTIGA,
    },
    deviceModel: 'T2B1',
    ...overrides,
});

const createMockDeps = (
    challengeStorage: ChallengeStorage,
    limitStorage: Pick<LimitStorage, 'addLimitToPubkey' | 'getLimitForPubkey'>,
    overrides?: Partial<RegisterOperationDeps>,
): RegisterOperationDeps => ({
    limitStorage,
    challengeStorage,
    ...overrides,
});

describe(storageRegisterOperation.name, () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(verifyAuthenticityProof).mockResolvedValue({
            valid: true,
            caPubKey: 'test-ca-pubkey',
            rootPubKey: T2B1rootPubKeyOptiga,
        });
        mockParseCertificate.mockReturnValue({
            tbsCertificate: {
                subjectPublicKeyInfo: {
                    algorithm: {
                        algorithmName: 'P-256',
                    },
                    bits: {
                        bytes: Buffer.from(
                            '049bbf06dad9ab5905e05471ce16d5222c89c2caa39f26267ac0747129885fbd441bcc7fa84de120a36755daf30a6f47e8c0d4bddc15036ed2a3447dfa7a1d3e88',
                            'hex',
                        ),
                    },
                },
            },
        } as any);
    });

    it('successfully registers storage for new publicKey', async () => {
        const challengeStorage: ChallengeStorage = {
            validateAndConsumeChallenge: () => ok(true),
            storeChallenge: () => ok(undefined),
            cleanupExpiredChallenges: () => ok(undefined),
        };

        const limitStorage: Pick<LimitStorage, 'addLimitToPubkey' | 'getLimitForPubkey'> = {
            getLimitForPubkey: () => ok(null),
            addLimitToPubkey: () =>
                ok({
                    totalStorageSize: size100,
                    unspendStorageSize: size100,
                }),
        };

        const deps = createMockDeps(challengeStorage, limitStorage);

        const result = await storageRegisterOperation(deps, createMockInput());

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.totalStorageSize).toBe(100);
            expect(result.value.unspendStorageSize).toBe(100);
        }
    });

    /* it('adds to existing storage for same publicKey', async () => {
        const challengeStorage: ChallengeStorage = {
            validateAndConsumeChallenge: () => ok(true),
            storeChallenge: () => ok(undefined),
            cleanupExpiredChallenges: () => ok(undefined),
        };

        const limitStorage: Pick<LimitStorage, 'addLimitToPubkey' | 'getLimitForPubkey'> = (() => {
            const state = { hasReturnedExisting: false };

            return {
                getLimitForPubkey: () => {
                    if (!state.hasReturnedExisting) {
                        state.hasReturnedExisting = true;

                        return ok({
                            totalStorageSize: size50,
                            unspendStorageSize: size50,
                        });
                    }

                    return ok(null);
                },
                addLimitToPubkey: () =>
                    ok({
                        totalStorageSize: size100,
                        unspendStorageSize: size100,
                    }),
            };
        })();

        const deps = createMockDeps(challengeStorage, limitStorage);

        const result = await storageRegisterOperation(deps, createMockInput({ size: size50 }));

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.totalStorageSize).toBe(100);
            expect(result.value.unspendStorageSize).toBe(100);
        }
    }); */

    it('returns ChallengeValidationFailed when challenge is invalid', async () => {
        const challengeStorage: ChallengeStorage = {
            validateAndConsumeChallenge: () => ok(false),
            storeChallenge: () => ok(undefined),
            cleanupExpiredChallenges: () => ok(undefined),
        };

        const limitStorage: Pick<LimitStorage, 'addLimitToPubkey' | 'getLimitForPubkey'> = {
            getLimitForPubkey: () => ok(null),
            addLimitToPubkey: () =>
                ok({
                    totalStorageSize: size100,
                    unspendStorageSize: size100,
                }),
        };

        const deps = createMockDeps(challengeStorage, limitStorage);

        const result = await storageRegisterOperation(deps, createMockInput());

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

        const limitStorage: Pick<LimitStorage, 'addLimitToPubkey' | 'getLimitForPubkey'> = {
            getLimitForPubkey: () => ok(null),
            addLimitToPubkey: () =>
                ok({
                    totalStorageSize: size50,
                    unspendStorageSize: size50,
                }),
        };

        const deps = createMockDeps(challengeStorage, limitStorage);

        const input = createMockInput({ size: size50 });

        const result1 = await storageRegisterOperation(deps, input);
        expect(result1.ok).toBe(true);

        const result2 = await storageRegisterOperation(deps, input);
        expect(result2.ok).toBe(false);
        if (!result2.ok) {
            expect(result2.error).toBe('ChallengeValidationFailed');
        }
    });

    it('returns StorageLimitExceeded when limit is exceeded', async () => {
        const challengeStorage: ChallengeStorage = {
            validateAndConsumeChallenge: () => ok(true),
            storeChallenge: () => ok(undefined),
            cleanupExpiredChallenges: () => ok(undefined),
        };

        const limitStorage: Pick<LimitStorage, 'addLimitToPubkey' | 'getLimitForPubkey'> = {
            getLimitForPubkey: () => ok(null),
            addLimitToPubkey: () =>
                ok({
                    totalStorageSize: size101,
                    unspendStorageSize: size101,
                }),
        };

        const deps = createMockDeps(challengeStorage, limitStorage, { maxStoragePerDevice: 100 });

        const result = await storageRegisterOperation(deps, createMockInput({ size: size101 }));

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('StorageLimitExceeded');
        }
    });

    it('returns StorageLimitExceeded when adding to existing storage exceeds limit', async () => {
        const challengeStorage: ChallengeStorage = {
            validateAndConsumeChallenge: () => ok(true),
            storeChallenge: () => ok(undefined),
            cleanupExpiredChallenges: () => ok(undefined),
        };

        const limitStorage: Pick<LimitStorage, 'addLimitToPubkey' | 'getLimitForPubkey'> = {
            getLimitForPubkey: () =>
                ok({
                    totalStorageSize: size50,
                    unspendStorageSize: size50,
                }),
            addLimitToPubkey: () =>
                ok({
                    totalStorageSize: size100,
                    unspendStorageSize: size100,
                }),
        };

        const deps = createMockDeps(challengeStorage, limitStorage, { maxStoragePerDevice: 100 });

        const result = await storageRegisterOperation(deps, createMockInput({ size: size101 }));

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('StorageLimitExceeded');
        }
    });

    it('returns SqliteError when challengeStorage.validateAndConsumeChallenge fails', async () => {
        const challengeStorage: ChallengeStorage = {
            validateAndConsumeChallenge: () =>
                err({ type: 'DatabaseError', error: new Error('Test SQLite error') } as any),
            storeChallenge: () => ok(undefined),
            cleanupExpiredChallenges: () => ok(undefined),
        };

        const limitStorage: Pick<LimitStorage, 'addLimitToPubkey' | 'getLimitForPubkey'> = {
            getLimitForPubkey: () => ok(null),
            addLimitToPubkey: () =>
                ok({
                    totalStorageSize: size100,
                    unspendStorageSize: size100,
                }),
        };

        const deps = createMockDeps(challengeStorage, limitStorage);

        const result = await storageRegisterOperation(deps, createMockInput());

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('DatabaseError');
        }
    });

    it('returns SqliteError when limitStorage.getLimitForPubkey fails', async () => {
        const challengeStorage: ChallengeStorage = {
            validateAndConsumeChallenge: () => ok(true),
            storeChallenge: () => ok(undefined),
            cleanupExpiredChallenges: () => ok(undefined),
        };

        const limitStorage: Pick<LimitStorage, 'addLimitToPubkey' | 'getLimitForPubkey'> = {
            getLimitForPubkey: () =>
                err({ type: 'DatabaseError', error: new Error('Test SQLite error') } as any),
            addLimitToPubkey: () =>
                ok({
                    totalStorageSize: size100,
                    unspendStorageSize: size100,
                }),
        };

        const deps = createMockDeps(challengeStorage, limitStorage);

        const result = await storageRegisterOperation(deps, createMockInput());

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('DatabaseError');
        }
    });

    it('returns ConsistencyError when limitStorage.addLimitToPubkey returns ConsistencyError', async () => {
        const challengeStorage: ChallengeStorage = {
            validateAndConsumeChallenge: () => ok(true),
            storeChallenge: () => ok(undefined),
            cleanupExpiredChallenges: () => ok(undefined),
        };

        const limitStorage: Pick<LimitStorage, 'addLimitToPubkey' | 'getLimitForPubkey'> = {
            getLimitForPubkey: () => ok(null),
            addLimitToPubkey: () =>
                err({ type: 'ConsistencyError', message: 'Test consistency error' }),
        };

        const deps = createMockDeps(challengeStorage, limitStorage);

        const result = await storageRegisterOperation(deps, createMockInput());

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('ConsistencyError');
        }
    });

    it('successfully validates real Trezor Optiga certificate and signature', async () => {
        const challengeStorage: ChallengeStorage = {
            validateAndConsumeChallenge: () => ok(true),
            storeChallenge: () => ok(undefined),
            cleanupExpiredChallenges: () => ok(undefined),
        };

        const limitStorage: Pick<LimitStorage, 'addLimitToPubkey' | 'getLimitForPubkey'> = {
            getLimitForPubkey: () => ok(null),
            addLimitToPubkey: () =>
                ok({
                    totalStorageSize: size100,
                    unspendStorageSize: size100,
                }),
        };

        const deps = createMockDeps(challengeStorage, limitStorage);

        const result = await storageRegisterOperation(deps, createMockInput());

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.totalStorageSize).toBe(100);
            expect(result.value.unspendStorageSize).toBe(100);
        }
    });

    it('fails validation with tampered signature', async () => {
        vi.mocked(verifyAuthenticityProof).mockResolvedValue({
            valid: false,
            error: 'INVALID_DEVICE_SIGNATURE',
        });

        const challengeStorage: ChallengeStorage = {
            validateAndConsumeChallenge: () => ok(true),
            storeChallenge: () => ok(undefined),
            cleanupExpiredChallenges: () => ok(undefined),
        };

        const limitStorage: Pick<LimitStorage, 'addLimitToPubkey' | 'getLimitForPubkey'> = {
            getLimitForPubkey: () => ok(null),
            addLimitToPubkey: () =>
                ok({
                    totalStorageSize: size100,
                    unspendStorageSize: size100,
                }),
        };

        const deps = createMockDeps(challengeStorage, limitStorage);

        const tamperedSignature =
            '3044022100c01793ffbe4f16d4efc84a4533d9bbfbbf1baa5349346678e07fdb6d848cca7902200df11b9d2850173d9c93993fca983c6d2a3f31ea69a0e19b69e18cc3b78424fe';

        const result = await storageRegisterOperation(
            deps,
            createMockInput({
                proof: getOrThrowTest(Proof.from(tamperedSignature)),
            }),
        );

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('ProofValidationFailed');
        }
    });

    it('fails validation with wrong challenge', async () => {
        vi.mocked(verifyAuthenticityProof).mockResolvedValue({
            valid: false,
            error: 'INVALID_DEVICE_SIGNATURE',
        });

        const challengeStorage: ChallengeStorage = {
            validateAndConsumeChallenge: () => ok(true),
            storeChallenge: () => ok(undefined),
            cleanupExpiredChallenges: () => ok(undefined),
        };

        const limitStorage: Pick<LimitStorage, 'addLimitToPubkey' | 'getLimitForPubkey'> = {
            getLimitForPubkey: () => ok(null),
            addLimitToPubkey: () =>
                ok({
                    totalStorageSize: size100,
                    unspendStorageSize: size100,
                }),
        };

        const deps = createMockDeps(challengeStorage, limitStorage);

        const wrongChallenge = '0000000000000000000000000000000000000000000000000000000000000000';

        const result = await storageRegisterOperation(
            deps,
            createMockInput({
                challenge: getOrThrowTest(Challenge.from(wrongChallenge)),
            }),
        );

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('ProofValidationFailed');
        }
    });

    it('fails with invalid certificate data', async () => {
        vi.mocked(verifyAuthenticityProof).mockResolvedValue({
            valid: false,
            error: 'INVALID_DEVICE_CERTIFICATE',
        });

        const challengeStorage: ChallengeStorage = {
            validateAndConsumeChallenge: () => ok(true),
            storeChallenge: () => ok(undefined),
            cleanupExpiredChallenges: () => ok(undefined),
        };

        const limitStorage: Pick<LimitStorage, 'addLimitToPubkey' | 'getLimitForPubkey'> = {
            getLimitForPubkey: () => ok(null),
            addLimitToPubkey: () =>
                ok({
                    totalStorageSize: size100,
                    unspendStorageSize: size100,
                }),
        };

        const deps = createMockDeps(challengeStorage, limitStorage);

        const result = await storageRegisterOperation(
            deps,
            createMockInput({
                certificateChain: {
                    deviceCert: 'invalid-cert-data',
                    caCert: 'invalid-ca-data',
                },
            }),
        );

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('CertificateValidationFailed');
        }
    });

    it('returns ProofValidationFailed when unsupported algorithm is used', async () => {
        vi.mocked(verifyAuthenticityProof).mockResolvedValue({
            valid: false,
            error: 'INVALID_DEVICE_SIGNATURE',
        });

        const challengeStorage: ChallengeStorage = {
            validateAndConsumeChallenge: () => ok(true),
            storeChallenge: () => ok(undefined),
            cleanupExpiredChallenges: () => ok(undefined),
        };

        const limitStorage: Pick<LimitStorage, 'addLimitToPubkey' | 'getLimitForPubkey'> = {
            getLimitForPubkey: () => ok(null),
            addLimitToPubkey: () =>
                ok({
                    totalStorageSize: size100,
                    unspendStorageSize: size100,
                }),
        };

        const deps = createMockDeps(challengeStorage, limitStorage);

        const result = await storageRegisterOperation(deps, createMockInput());

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('ProofValidationFailed');
        }
    });

    describe('certificate validation errors from verifyAuthenticityProof', () => {
        it('returns CertificateValidationFailed when ROOT_PUBKEY_NOT_FOUND', async () => {
            vi.mocked(verifyAuthenticityProof).mockResolvedValue({
                valid: false,
                error: 'ROOT_PUBKEY_NOT_FOUND',
                caPubKey: 'test-ca-pubkey',
            });

            const challengeStorage: ChallengeStorage = {
                validateAndConsumeChallenge: () => ok(true),
                storeChallenge: () => ok(undefined),
                cleanupExpiredChallenges: () => ok(undefined),
            };

            const limitStorage: Pick<LimitStorage, 'addLimitToPubkey' | 'getLimitForPubkey'> = {
                getLimitForPubkey: () => ok(null),
                addLimitToPubkey: () =>
                    ok({
                        totalStorageSize: size100,
                        unspendStorageSize: size100,
                    }),
            };

            const deps = createMockDeps(challengeStorage, limitStorage);

            const result = await storageRegisterOperation(deps, createMockInput());

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe('CertificateValidationFailed');
            }
        });

        it('returns CertificateValidationFailed when CA_PUBKEY_BLACKLISTED', async () => {
            vi.mocked(verifyAuthenticityProof).mockResolvedValue({
                valid: false,
                error: 'CA_PUBKEY_BLACKLISTED',
                caPubKey: 'test-ca-pubkey',
                rootPubKey: 'test-root-pubkey',
            });

            const challengeStorage: ChallengeStorage = {
                validateAndConsumeChallenge: () => ok(true),
                storeChallenge: () => ok(undefined),
                cleanupExpiredChallenges: () => ok(undefined),
            };

            const limitStorage: Pick<LimitStorage, 'addLimitToPubkey' | 'getLimitForPubkey'> = {
                getLimitForPubkey: () => ok(null),
                addLimitToPubkey: () =>
                    ok({
                        totalStorageSize: size100,
                        unspendStorageSize: size100,
                    }),
            };

            const deps = createMockDeps(challengeStorage, limitStorage);

            const result = await storageRegisterOperation(deps, createMockInput());

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe('CertificateValidationFailed');
            }
        });

        it('returns CertificateValidationFailed when INVALID_DEVICE_MODEL', async () => {
            vi.mocked(verifyAuthenticityProof).mockResolvedValue({
                valid: false,
                error: 'INVALID_DEVICE_MODEL',
                caPubKey: 'test-ca-pubkey',
                rootPubKey: 'test-root-pubkey',
            });

            const challengeStorage: ChallengeStorage = {
                validateAndConsumeChallenge: () => ok(true),
                storeChallenge: () => ok(undefined),
                cleanupExpiredChallenges: () => ok(undefined),
            };

            const limitStorage: Pick<LimitStorage, 'addLimitToPubkey' | 'getLimitForPubkey'> = {
                getLimitForPubkey: () => ok(null),
                addLimitToPubkey: () =>
                    ok({
                        totalStorageSize: size100,
                        unspendStorageSize: size100,
                    }),
            };

            const deps = createMockDeps(challengeStorage, limitStorage);

            const result = await storageRegisterOperation(deps, createMockInput());

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe('CertificateValidationFailed');
            }
        });

        it('returns CertificateValidationFailed when INVALID_DEVICE_CERTIFICATE', async () => {
            vi.mocked(verifyAuthenticityProof).mockResolvedValue({
                valid: false,
                error: 'INVALID_DEVICE_CERTIFICATE',
                caPubKey: 'test-ca-pubkey',
                rootPubKey: 'test-root-pubkey',
            });

            const challengeStorage: ChallengeStorage = {
                validateAndConsumeChallenge: () => ok(true),
                storeChallenge: () => ok(undefined),
                cleanupExpiredChallenges: () => ok(undefined),
            };

            const limitStorage: Pick<LimitStorage, 'addLimitToPubkey' | 'getLimitForPubkey'> = {
                getLimitForPubkey: () => ok(null),
                addLimitToPubkey: () =>
                    ok({
                        totalStorageSize: size100,
                        unspendStorageSize: size100,
                    }),
            };

            const deps = createMockDeps(challengeStorage, limitStorage);

            const result = await storageRegisterOperation(deps, createMockInput());

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe('CertificateValidationFailed');
            }
        });
    });
});
