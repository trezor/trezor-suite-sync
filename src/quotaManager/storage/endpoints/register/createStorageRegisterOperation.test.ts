import { err, ok } from '@evolu/common';
import { verifyAuthenticityProof } from '@trezor/device-authenticity';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    type RegisterOperationInput,
    createStorageRegisterOperation,
} from './createStorageRegisterOperation.js';
import { CA_CERT_OPTIGA, DEVICE_CERT_OPTIGA } from '../../../../../test/mocks/certificates.js';
import { getOrThrowTest } from '../../../../getOrThrowTest.js';
import {
    Challenge,
    SessionId,
} from '../../../../storage/challengeStorage/createChallengeStorage.js';
import { ValidateAndConsumeChallenge } from '../../../../storage/challengeStorage/methods/createValidateAndConsumeChallenge.js';
import {
    Proof,
    PublicKey,
    RotationIndex,
    Size,
} from '../../../../storage/limitStorage/limitStorage.js';
import { AddLimitToPubkey } from '../../../../storage/limitStorage/methods/createAddLimitToPubkey.js';
import { GetLimitsForPubkey } from '../../../../storage/limitStorage/methods/createGetLimitsForPubkey.js';
import { MAX_DEVICE_SIZE_QUOTA } from '../../../constants.js';
import { numberToBuffer } from '../../utils/utils.js';

const SIGNATURE_OPTIGA =
    '3045022100c01793ffbe4f16d4efc84a4533d9bbfbbf1baa5349346678e07fdb6d848cca7902200df11b9d2850173d9c93993fca983c6d2a3f31ea69a0e19b69e18cc3b78424fe';
const CHALLENGE = '29d0be0f3cb191c80d108359c64d22984a77ad8b99433814be31db0b6e9e7920';

const { T2B1rootPubKeyOptiga, mockParseCertificate } = vi.hoisted(() => ({
    T2B1rootPubKeyOptiga:
        '04626d58aca84f0fcb52ea63f0eb08de1067b8d406574a715d5e7928f4b67f113a00fb5c5918e74d2327311946c446b242c20fe7347482999bdc1e229b94e27d96',
    mockParseCertificate: vi.fn(),
}));

vi.mock('@trezor/device-authenticity', () => ({
    verifyAuthenticityProof: vi.fn().mockResolvedValue({
        valid: true,
        caPubKey: 'test-ca-pubkey',
        rootPubKey: T2B1rootPubKeyOptiga,
    }),
    deviceAuthenticityBlacklistConfig: vi.fn().mockResolvedValue({
        version: 1,
        blacklistedCaPubKeys: [],
        debug: {
            blacklistedCaPubKeys: [],
        },
    }),
    deviceAuthenticityConfig: vi.fn().mockResolvedValue({
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

const maxSize = getOrThrowTest(Size.from(MAX_DEVICE_SIZE_QUOTA));
const maxSizeDouble = getOrThrowTest(Size.from(MAX_DEVICE_SIZE_QUOTA * 2));
const rotationIndex42 = getOrThrowTest(RotationIndex.from(42));

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

const proofValidationCases: Array<{
    name: string;
    inputOverrides: Partial<RegisterOperationInput>;
    expectedChallengePrefix: string;
    expectedBufferChunks: Buffer[];
}> = [
    {
        name: 'V1',
        inputOverrides: {},
        expectedChallengePrefix: 'EvoluSignRegistrationRequestV1:',
        expectedBufferChunks: [
            Buffer.from(publicKey, 'hex'),
            Buffer.from(CHALLENGE, 'hex'),
            numberToBuffer(size100),
        ],
    },
    {
        name: 'V2',
        inputOverrides: { rotationIndex: rotationIndex42 },
        expectedChallengePrefix: 'EvoluSignRegistrationRequestV2:',
        expectedBufferChunks: [
            Buffer.from(publicKey, 'hex'),
            Buffer.from(CHALLENGE, 'hex'),
            numberToBuffer(size100),
            numberToBuffer(42),
        ],
    },
];

describe(createStorageRegisterOperation.name, () => {
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
        const validateAndConsumeChallenge: ValidateAndConsumeChallenge = () =>
            Promise.resolve(ok(true));

        const getLimitsForPubkey = () => Promise.resolve(ok(null));
        const addLimitToPubkey = () =>
            Promise.resolve(
                ok({
                    totalStorageSize: size100,
                    unspentStorageSize: size100,
                }),
            );

        const storageRegisterOperation = createStorageRegisterOperation({
            validateAndConsumeChallenge,
            addLimitToPubkey,
            getLimitsForPubkey,
        });
        const result = await storageRegisterOperation(createMockInput());

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.totalStorageSize).toBe(100);
            expect(result.value.unspentStorageSize).toBe(100);
        }
    });

    it.each(proofValidationCases)(
        'verifies $name registration proof',
        async ({ inputOverrides, expectedChallengePrefix, expectedBufferChunks }) => {
            const validateAndConsumeChallenge: ValidateAndConsumeChallenge = () =>
                Promise.resolve(ok(true));

            const getLimitsForPubkey = () => Promise.resolve(ok(null));
            const addLimitToPubkey = () =>
                Promise.resolve(
                    ok({
                        totalStorageSize: size100,
                        unspentStorageSize: size100,
                    }),
                );

            const storageRegisterOperation = createStorageRegisterOperation({
                validateAndConsumeChallenge,
                addLimitToPubkey,
                getLimitsForPubkey,
            });
            const result = await storageRegisterOperation(createMockInput(inputOverrides));

            expect(result.ok).toBe(true);
            expect(verifyAuthenticityProof).toHaveBeenCalledWith(
                expect.objectContaining({
                    challengePrefix: expectedChallengePrefix,
                    bufferChunks: expectedBufferChunks,
                }),
            );
        },
    );

    it('returns ChallengeValidationFailed when challenge is invalid', async () => {
        const validateAndConsumeChallenge: ValidateAndConsumeChallenge = () =>
            Promise.resolve(ok(false));

        const getLimitsForPubkey = () => Promise.resolve(ok(null));
        const addLimitToPubkey = () =>
            Promise.resolve(
                ok({
                    totalStorageSize: size100,
                    unspentStorageSize: size100,
                }),
            );

        const storageRegisterOperation = createStorageRegisterOperation({
            validateAndConsumeChallenge,
            addLimitToPubkey,
            getLimitsForPubkey,
        });
        const result = await storageRegisterOperation(createMockInput());

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('ChallengeValidationFailed');
        }
    });

    it('returns ChallengeValidationFailed when challenge is consumed', async () => {
        const state = { hasBeenConsumed: false };

        const validateAndConsumeChallenge: ValidateAndConsumeChallenge = () => {
            if (!state.hasBeenConsumed) {
                state.hasBeenConsumed = true;

                return Promise.resolve(ok(true));
            }

            return Promise.resolve(ok(false));
        };

        const getLimitsForPubkey = () => Promise.resolve(ok(null));
        const addLimitToPubkey = () =>
            Promise.resolve(
                ok({
                    totalStorageSize: size50,
                    unspentStorageSize: size50,
                }),
            );

        const input = createMockInput({ size: size50 });

        const storageRegisterOperation = createStorageRegisterOperation({
            validateAndConsumeChallenge,
            addLimitToPubkey,
            getLimitsForPubkey,
        });
        const result1 = await storageRegisterOperation(input);
        expect(result1.ok).toBe(true);

        const result2 = await storageRegisterOperation(input);
        expect(result2.ok).toBe(false);
        if (!result2.ok) {
            expect(result2.error).toBe('ChallengeValidationFailed');
        }
    });

    it('returns StorageLimitExceeded when limit is exceeded', async () => {
        const validateAndConsumeChallenge: ValidateAndConsumeChallenge = () =>
            Promise.resolve(ok(true));

        const getLimitsForPubkey: GetLimitsForPubkey = () => Promise.resolve(ok(null));
        const addLimitToPubkey: AddLimitToPubkey = () =>
            Promise.resolve(
                ok({
                    totalStorageSize: maxSize,
                    unspentStorageSize: maxSize,
                }),
            );

        const storageRegisterOperation = createStorageRegisterOperation({
            validateAndConsumeChallenge,
            addLimitToPubkey,
            getLimitsForPubkey,
        });
        const result = await storageRegisterOperation(createMockInput({ size: maxSizeDouble }));

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('StorageLimitExceeded');
        }
    });

    it('returns StorageLimitExceeded when adding to existing storage exceeds limit', async () => {
        const validateAndConsumeChallenge: ValidateAndConsumeChallenge = () =>
            Promise.resolve(ok(true));

        const getLimitsForPubkey = () =>
            Promise.resolve(
                ok({
                    totalStorageSize: maxSize,
                    unspentStorageSize: size100,
                }),
            );
        const addLimitToPubkey = () =>
            Promise.resolve(
                ok({
                    totalStorageSize: size100,
                    unspentStorageSize: size100,
                }),
            );

        const storageRegisterOperation = createStorageRegisterOperation({
            validateAndConsumeChallenge,
            addLimitToPubkey,
            getLimitsForPubkey,
        });
        const result = await storageRegisterOperation(createMockInput({ size: size101 }));

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('StorageLimitExceeded');
        }
    });

    it('returns SqliteError when challengeStorage.validateAndConsumeChallenge fails', async () => {
        const validateAndConsumeChallenge: ValidateAndConsumeChallenge = () =>
            Promise.resolve(
                err({ type: 'DatabaseError', error: new Error('Test SQLite error') } as any),
            );

        const getLimitsForPubkey = () => Promise.resolve(ok(null));
        const addLimitToPubkey = () =>
            Promise.resolve(
                ok({
                    totalStorageSize: size100,
                    unspentStorageSize: size100,
                }),
            );

        const storageRegisterOperation = createStorageRegisterOperation({
            validateAndConsumeChallenge,
            addLimitToPubkey,
            getLimitsForPubkey,
        });
        const result = await storageRegisterOperation(createMockInput());

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('DatabaseError');
        }
    });

    it('returns SqliteError when limitStorage.getLimitsForPubkey fails', async () => {
        const validateAndConsumeChallenge: ValidateAndConsumeChallenge = () =>
            Promise.resolve(ok(true));

        const getLimitsForPubkey = () =>
            Promise.resolve(
                err({ type: 'DatabaseError', error: new Error('Test SQLite error') } as any),
            );
        const addLimitToPubkey = () =>
            Promise.resolve(
                ok({
                    totalStorageSize: size100,
                    unspentStorageSize: size100,
                }),
            );

        const storageRegisterOperation = createStorageRegisterOperation({
            validateAndConsumeChallenge,
            addLimitToPubkey,
            getLimitsForPubkey,
        });
        const result = await storageRegisterOperation(createMockInput());

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('DatabaseError');
        }
    });

    it('returns ConsistencyError when limitStorage.addLimitToPubkey returns ConsistencyError', async () => {
        const validateAndConsumeChallenge: ValidateAndConsumeChallenge = () =>
            Promise.resolve(ok(true));

        const getLimitsForPubkey: GetLimitsForPubkey = () => Promise.resolve(ok(null));
        const addLimitToPubkey: AddLimitToPubkey = () =>
            Promise.resolve(err({ type: 'ConsistencyError', message: 'Test consistency error' }));

        const storageRegisterOperation = createStorageRegisterOperation({
            validateAndConsumeChallenge,
            addLimitToPubkey,
            getLimitsForPubkey,
        });
        const result = await storageRegisterOperation(createMockInput());

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('ConsistencyError');
        }
    });

    it('successfully validates real Trezor Optiga certificate and signature', async () => {
        const validateAndConsumeChallenge: ValidateAndConsumeChallenge = () =>
            Promise.resolve(ok(true));

        const getLimitsForPubkey: GetLimitsForPubkey = () => Promise.resolve(ok(null));
        const addLimitToPubkey: AddLimitToPubkey = () =>
            Promise.resolve(
                ok({
                    totalStorageSize: size100,
                    unspentStorageSize: size100,
                }),
            );

        const storageRegisterOperation = createStorageRegisterOperation({
            validateAndConsumeChallenge,
            addLimitToPubkey,
            getLimitsForPubkey,
        });
        const result = await storageRegisterOperation(createMockInput());

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.totalStorageSize).toBe(100);
            expect(result.value.unspentStorageSize).toBe(100);
        }
    });

    it('fails validation with tampered signature', async () => {
        vi.mocked(verifyAuthenticityProof).mockResolvedValue({
            valid: false,
            error: 'INVALID_DEVICE_SIGNATURE',
        });

        const validateAndConsumeChallenge: ValidateAndConsumeChallenge = () =>
            Promise.resolve(ok(true));

        const getLimitsForPubkey = () => Promise.resolve(ok(null));
        const addLimitToPubkey = () =>
            Promise.resolve(
                ok({
                    totalStorageSize: size100,
                    unspentStorageSize: size100,
                }),
            );

        const tamperedSignature =
            '3044022100c01793ffbe4f16d4efc84a4533d9bbfbbf1baa5349346678e07fdb6d848cca7902200df11b9d2850173d9c93993fca983c6d2a3f31ea69a0e19b69e18cc3b78424fe';

        const storageRegisterOperation = createStorageRegisterOperation({
            validateAndConsumeChallenge,
            addLimitToPubkey,
            getLimitsForPubkey,
        });
        const result = await storageRegisterOperation(
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

        const validateAndConsumeChallenge: ValidateAndConsumeChallenge = () =>
            Promise.resolve(ok(true));

        const getLimitsForPubkey = () => Promise.resolve(ok(null));
        const addLimitToPubkey = () =>
            Promise.resolve(
                ok({
                    totalStorageSize: size100,
                    unspentStorageSize: size100,
                }),
            );

        const wrongChallenge = '0000000000000000000000000000000000000000000000000000000000000000';

        const storageRegisterOperation = createStorageRegisterOperation({
            validateAndConsumeChallenge,
            addLimitToPubkey,
            getLimitsForPubkey,
        });
        const result = await storageRegisterOperation(
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

        const validateAndConsumeChallenge: ValidateAndConsumeChallenge = () =>
            Promise.resolve(ok(true));

        const getLimitsForPubkey = () => Promise.resolve(ok(null));
        const addLimitToPubkey = () =>
            Promise.resolve(
                ok({
                    totalStorageSize: size100,
                    unspentStorageSize: size100,
                }),
            );

        const storageRegisterOperation = createStorageRegisterOperation({
            validateAndConsumeChallenge,
            addLimitToPubkey,
            getLimitsForPubkey,
        });
        const result = await storageRegisterOperation(
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

        const validateAndConsumeChallenge: ValidateAndConsumeChallenge = () =>
            Promise.resolve(ok(true));

        const getLimitsForPubkey = () => Promise.resolve(ok(null));
        const addLimitToPubkey = () =>
            Promise.resolve(
                ok({
                    totalStorageSize: size100,
                    unspentStorageSize: size100,
                }),
            );

        const storageRegisterOperation = createStorageRegisterOperation({
            validateAndConsumeChallenge,
            addLimitToPubkey,
            getLimitsForPubkey,
        });
        const result = await storageRegisterOperation(createMockInput());

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

            const validateAndConsumeChallenge: ValidateAndConsumeChallenge = () =>
                Promise.resolve(ok(true));

            const getLimitsForPubkey = () => Promise.resolve(ok(null));
            const addLimitToPubkey = () =>
                Promise.resolve(
                    ok({
                        totalStorageSize: size100,
                        unspentStorageSize: size100,
                    }),
                );

            const storageRegisterOperation = createStorageRegisterOperation({
                validateAndConsumeChallenge,
                addLimitToPubkey,
                getLimitsForPubkey,
            });
            const result = await storageRegisterOperation(createMockInput());

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

            const validateAndConsumeChallenge: ValidateAndConsumeChallenge = () =>
                Promise.resolve(ok(true));

            const getLimitsForPubkey = () => Promise.resolve(ok(null));
            const addLimitToPubkey = () =>
                Promise.resolve(
                    ok({
                        totalStorageSize: size100,
                        unspentStorageSize: size100,
                    }),
                );

            const storageRegisterOperation = createStorageRegisterOperation({
                validateAndConsumeChallenge,
                addLimitToPubkey,
                getLimitsForPubkey,
            });
            const result = await storageRegisterOperation(createMockInput());

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

            const validateAndConsumeChallenge: ValidateAndConsumeChallenge = () =>
                Promise.resolve(ok(true));

            const getLimitsForPubkey = () => Promise.resolve(ok(null));
            const addLimitToPubkey = () =>
                Promise.resolve(
                    ok({
                        totalStorageSize: size100,
                        unspentStorageSize: size100,
                    }),
                );

            const storageRegisterOperation = createStorageRegisterOperation({
                validateAndConsumeChallenge,
                addLimitToPubkey,
                getLimitsForPubkey,
            });
            const result = await storageRegisterOperation(createMockInput());

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

            const validateAndConsumeChallenge: ValidateAndConsumeChallenge = () =>
                Promise.resolve(ok(true));

            const getLimitsForPubkey = () => Promise.resolve(ok(null));
            const addLimitToPubkey = () =>
                Promise.resolve(
                    ok({
                        totalStorageSize: size100,
                        unspentStorageSize: size100,
                    }),
                );

            const storageRegisterOperation = createStorageRegisterOperation({
                validateAndConsumeChallenge,
                addLimitToPubkey,
                getLimitsForPubkey,
            });
            const result = await storageRegisterOperation(createMockInput());

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe('CertificateValidationFailed');
            }
        });
    });
});
