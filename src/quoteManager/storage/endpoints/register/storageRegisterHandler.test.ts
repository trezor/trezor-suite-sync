import Fastify from 'fastify';
import { assert, beforeEach, describe, expect, it, vi } from 'vitest';

import { storageRegisterEndpoint } from './storageRegisterEndpoint.js';
import { storageRegisterHandler } from './storageRegisterHandler.js';
import { CA_CERT_OPTIGA, DEVICE_CERT_OPTIGA } from '../../../../../test/mocks/certificates.js';
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
import { prepareSqlite } from '../../../../storage/prepareSqlite.js';
import { evoluValidatorCompiler } from '../../../evoluValidatorCompiler.js';

const mockVerifyAuthenticityProof = vi.fn();

vi.mock('@trezor/device-authenticity', async () => {
    const actual = await vi.importActual<typeof import('@trezor/device-authenticity')>(
        '@trezor/device-authenticity',
    );

    return {
        ...actual,
        verifyAuthenticityProof: (...args: any[]) => mockVerifyAuthenticityProof(...args),
    };
});

vi.mock('crypto', async () => {
    const actual = await vi.importActual<typeof import('crypto')>('crypto');

    return {
        ...actual,
        createVerify: vi.fn().mockImplementation(algorithm => {
            const verify = actual.createVerify(algorithm);
            const originalUpdate = verify.update.bind(verify);

            verify.update = vi.fn().mockImplementation(data => {
                originalUpdate(data);

                return verify;
            });
            verify.verify = vi.fn().mockReturnValue(true);

            return verify;
        }),
    };
});

vi.stubGlobal('crypto', {
    ...globalThis.crypto,
    subtle: {
        ...globalThis.crypto?.subtle,
        importKey: vi.fn().mockResolvedValue({}),
        exportKey: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
        verify: vi.fn().mockResolvedValue(true),
    } as any,
});

const publicKey1 = getOrThrowTest(PublicKey.from('test-pubkey-123'));
const publicKey2 = getOrThrowTest(PublicKey.from('test-pubkey-456'));
const size50 = getOrThrowTest(Size.from(50));
const size100 = getOrThrowTest(Size.from(100));

type CreateAppParams = {
    maxStoragePerDevice?: number;
};

const createApp = async (params?: CreateAppParams) => {
    const sqlite = await prepareSqlite({ inMemory: true });
    assert(sqlite.ok);

    const challengeStorageResult = createChallengeStorage({ sqlite: sqlite.value });
    assert(challengeStorageResult.ok);

    const limitStorageResult = createLimitStorage({ sqlite: sqlite.value });
    assert(limitStorageResult.ok);

    const app = Fastify();

    app.setValidatorCompiler(evoluValidatorCompiler);

    app.post(
        '/storage/register',
        storageRegisterEndpoint.schema,
        storageRegisterEndpoint.createHandler({
            limitStorage: limitStorageResult.value,
            challengeStorage: challengeStorageResult.value,
            maxStoragePerDevice: params?.maxStoragePerDevice,
        }),
    );

    return {
        app,
        limitStorage: limitStorageResult.value,
        challengeStorage: challengeStorageResult.value,
    };
};

describe(storageRegisterHandler.name, () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockVerifyAuthenticityProof.mockResolvedValue({
            valid: true,
            caPubKey: 'test-ca-pubkey',
            rootPubKey: 'test-root-pubkey',
        });
    });

    describe('success scenarios', () => {
        it('successfully registers storage for T2B1 device', async () => {
            const { app, challengeStorage } = await createApp();

            const sessionId = getOrThrowTest(SessionId.from('session-123'));
            const challenge = getOrThrowTest(Challenge.from('challenge-abc-123'));
            const storeResult = challengeStorage.storeChallenge(sessionId, challenge);
            assert(storeResult.ok);

            const response = await app.inject({
                method: 'POST',
                url: '/storage/register',
                payload: {
                    publicKey: publicKey1.toString(),
                    size: size100,
                    challenge: challenge.toString(),
                    sessionId: sessionId.toString(),
                    proof: getOrThrowTest(Proof.from('any-signature-hex')).toString(),
                    certificateChain: {
                        deviceCert: DEVICE_CERT_OPTIGA,
                        caCert: CA_CERT_OPTIGA,
                    },
                    deviceModel: 'T2B1',
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body).toHaveProperty('totalStorageSize');
            expect(body).toHaveProperty('unspendStorageSize');
            expect(body.totalStorageSize).toBe(size100);
            expect(body.unspendStorageSize).toBe(size100);
        });

        it('allows incremental registration for same device', async () => {
            const { app, challengeStorage } = await createApp();

            const sessionId1 = getOrThrowTest(SessionId.from('session-1'));
            const challenge1 = getOrThrowTest(Challenge.from('challenge-1'));
            challengeStorage.storeChallenge(sessionId1, challenge1);

            const response1 = await app.inject({
                method: 'POST',
                url: '/storage/register',
                payload: {
                    publicKey: publicKey1.toString(),
                    size: size50,
                    challenge: challenge1.toString(),
                    sessionId: sessionId1.toString(),
                    proof: getOrThrowTest(Proof.from('proof-1')).toString(),
                    certificateChain: {
                        deviceCert: DEVICE_CERT_OPTIGA,
                        caCert: CA_CERT_OPTIGA,
                    },
                    deviceModel: 'T2B1',
                },
            });

            expect(response1.statusCode).toBe(200);
            const body1 = JSON.parse(response1.body);
            expect(body1.totalStorageSize).toBe(size50);
            expect(body1.unspendStorageSize).toBe(size50);

            const sessionId2 = getOrThrowTest(SessionId.from('session-2'));
            const challenge2 = getOrThrowTest(Challenge.from('challenge-2'));
            challengeStorage.storeChallenge(sessionId2, challenge2);

            const response2 = await app.inject({
                method: 'POST',
                url: '/storage/register',
                payload: {
                    publicKey: publicKey1.toString(),
                    size: size50,
                    challenge: challenge2.toString(),
                    sessionId: sessionId2.toString(),
                    proof: getOrThrowTest(Proof.from('proof-2')).toString(),
                    certificateChain: {
                        deviceCert: DEVICE_CERT_OPTIGA,
                        caCert: CA_CERT_OPTIGA,
                    },
                    deviceModel: 'T2B1',
                },
            });

            expect(response2.statusCode).toBe(200);
            const body2 = JSON.parse(response2.body);
            expect(body2.totalStorageSize).toBe(size100);
            expect(body2.unspendStorageSize).toBe(size100);
        });

        it('allows multiple different devices to register', async () => {
            const { app, challengeStorage } = await createApp();

            const sessionId1 = getOrThrowTest(SessionId.from('session-device-1'));
            const challenge1 = getOrThrowTest(Challenge.from('challenge-device-1'));
            challengeStorage.storeChallenge(sessionId1, challenge1);

            const response1 = await app.inject({
                method: 'POST',
                url: '/storage/register',
                payload: {
                    publicKey: publicKey1.toString(),
                    size: size100,
                    challenge: challenge1.toString(),
                    sessionId: sessionId1.toString(),
                    proof: getOrThrowTest(Proof.from('proof-device-1')).toString(),
                    certificateChain: {
                        deviceCert: DEVICE_CERT_OPTIGA,
                        caCert: CA_CERT_OPTIGA,
                    },
                    deviceModel: 'T2B1',
                },
            });

            expect(response1.statusCode).toBe(200);

            const sessionId2 = getOrThrowTest(SessionId.from('session-device-2'));
            const challenge2 = getOrThrowTest(Challenge.from('challenge-device-2'));
            challengeStorage.storeChallenge(sessionId2, challenge2);

            const response2 = await app.inject({
                method: 'POST',
                url: '/storage/register',
                payload: {
                    publicKey: publicKey2.toString(),
                    size: size100,
                    challenge: challenge2.toString(),
                    sessionId: sessionId2.toString(),
                    proof: getOrThrowTest(Proof.from('proof-device-2')).toString(),
                    certificateChain: {
                        deviceCert: DEVICE_CERT_OPTIGA,
                        caCert: CA_CERT_OPTIGA,
                    },
                    deviceModel: 'T2B1',
                },
            });

            expect(response2.statusCode).toBe(200);
            const body2 = JSON.parse(response2.body);
            expect(body2.totalStorageSize).toBe(size100);
            expect(body2.unspendStorageSize).toBe(size100);
        });
    });

    describe('proof validation failures', () => {
        it('returns 400 when proof validation fails with invalid signature', async () => {
            mockVerifyAuthenticityProof.mockResolvedValue({
                valid: false,
                error: 'INVALID_DEVICE_SIGNATURE',
                caPubKey: 'test-ca-pubkey',
                rootPubKey: 'test-root-pubkey',
            });

            const { app, challengeStorage } = await createApp();

            const sessionId = getOrThrowTest(SessionId.from('session-invalid-sig'));
            const challenge = getOrThrowTest(Challenge.from('challenge-invalid-sig'));
            challengeStorage.storeChallenge(sessionId, challenge);

            const response = await app.inject({
                method: 'POST',
                url: '/storage/register',
                payload: {
                    publicKey: publicKey1.toString(),
                    size: size100,
                    challenge: challenge.toString(),
                    sessionId: sessionId.toString(),
                    proof: getOrThrowTest(Proof.from('invalid-signature')).toString(),
                    certificateChain: {
                        deviceCert: DEVICE_CERT_OPTIGA,
                        caCert: CA_CERT_OPTIGA,
                    },
                    deviceModel: 'T2B1',
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('ProofValidationFailed');
        });
    });

    describe('certificate validation failures', () => {
        it('returns 400 when device certificate is invalid', async () => {
            mockVerifyAuthenticityProof.mockResolvedValue({
                valid: false,
                error: 'INVALID_DEVICE_CERTIFICATE',
                caPubKey: 'test-ca-pubkey',
                rootPubKey: undefined,
            });

            const { app, challengeStorage } = await createApp();

            const sessionId = getOrThrowTest(SessionId.from('session-invalid-cert'));
            const challenge = getOrThrowTest(Challenge.from('challenge-invalid-cert'));
            challengeStorage.storeChallenge(sessionId, challenge);

            const response = await app.inject({
                method: 'POST',
                url: '/storage/register',
                payload: {
                    publicKey: publicKey1.toString(),
                    size: size100,
                    challenge: challenge.toString(),
                    sessionId: sessionId.toString(),
                    proof: getOrThrowTest(Proof.from('proof-invalid-cert')).toString(),
                    certificateChain: {
                        deviceCert: 'invalid-cert',
                        caCert: CA_CERT_OPTIGA,
                    },
                    deviceModel: 'T2B1',
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('CertificateValidationFailed');
        });

        it('returns 400 when root pubkey is not found', async () => {
            mockVerifyAuthenticityProof.mockResolvedValue({
                valid: false,
                error: 'ROOT_PUBKEY_NOT_FOUND',
                caPubKey: 'test-ca-pubkey',
                rootPubKey: undefined,
            });

            const { app, challengeStorage } = await createApp();

            const sessionId = getOrThrowTest(SessionId.from('session-no-root'));
            const challenge = getOrThrowTest(Challenge.from('challenge-no-root'));
            challengeStorage.storeChallenge(sessionId, challenge);

            const response = await app.inject({
                method: 'POST',
                url: '/storage/register',
                payload: {
                    publicKey: publicKey1.toString(),
                    size: size100,
                    challenge: challenge.toString(),
                    sessionId: sessionId.toString(),
                    proof: getOrThrowTest(Proof.from('proof-no-root')).toString(),
                    certificateChain: {
                        deviceCert: DEVICE_CERT_OPTIGA,
                        caCert: CA_CERT_OPTIGA,
                    },
                    deviceModel: 'T2B1',
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('CertificateValidationFailed');
        });

        it('returns 400 when CA pubkey is blacklisted', async () => {
            mockVerifyAuthenticityProof.mockResolvedValue({
                valid: false,
                error: 'CA_PUBKEY_BLACKLISTED',
                caPubKey: 'blacklisted-ca-pubkey',
                rootPubKey: 'test-root-pubkey',
            });

            const { app, challengeStorage } = await createApp();

            const sessionId = getOrThrowTest(SessionId.from('session-blacklisted'));
            const challenge = getOrThrowTest(Challenge.from('challenge-blacklisted'));
            challengeStorage.storeChallenge(sessionId, challenge);

            const response = await app.inject({
                method: 'POST',
                url: '/storage/register',
                payload: {
                    publicKey: publicKey1.toString(),
                    size: size100,
                    challenge: challenge.toString(),
                    sessionId: sessionId.toString(),
                    proof: getOrThrowTest(Proof.from('proof-blacklisted')).toString(),
                    certificateChain: {
                        deviceCert: DEVICE_CERT_OPTIGA,
                        caCert: CA_CERT_OPTIGA,
                    },
                    deviceModel: 'T2B1',
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('CertificateValidationFailed');
        });

        it('returns 400 when device model is invalid', async () => {
            mockVerifyAuthenticityProof.mockResolvedValue({
                valid: false,
                error: 'INVALID_DEVICE_MODEL',
                caPubKey: 'test-ca-pubkey',
                rootPubKey: 'test-root-pubkey',
            });

            const { app, challengeStorage } = await createApp();

            const sessionId = getOrThrowTest(SessionId.from('session-invalid-model'));
            const challenge = getOrThrowTest(Challenge.from('challenge-invalid-model'));
            challengeStorage.storeChallenge(sessionId, challenge);

            const response = await app.inject({
                method: 'POST',
                url: '/storage/register',
                payload: {
                    publicKey: publicKey1.toString(),
                    size: size100,
                    challenge: challenge.toString(),
                    sessionId: sessionId.toString(),
                    proof: getOrThrowTest(Proof.from('proof-invalid-model')).toString(),
                    certificateChain: {
                        deviceCert: DEVICE_CERT_OPTIGA,
                        caCert: CA_CERT_OPTIGA,
                    },
                    deviceModel: 'T2B1',
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('CertificateValidationFailed');
        });
    });

    describe('challenge validation failures', () => {
        it('returns 400 when challenge is not found for sessionId', async () => {
            const { app } = await createApp();

            const sessionId = getOrThrowTest(SessionId.from('session-no-challenge'));
            const challenge = getOrThrowTest(Challenge.from('challenge-no-challenge'));

            const response = await app.inject({
                method: 'POST',
                url: '/storage/register',
                payload: {
                    publicKey: publicKey1.toString(),
                    size: size100,
                    challenge: challenge.toString(),
                    sessionId: sessionId.toString(),
                    proof: getOrThrowTest(Proof.from('proof-no-challenge')).toString(),
                    certificateChain: {
                        deviceCert: DEVICE_CERT_OPTIGA,
                        caCert: CA_CERT_OPTIGA,
                    },
                    deviceModel: 'T2B1',
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('ChallengeValidationFailed');
        });

        it('returns 400 when challenge is wrong for sessionId', async () => {
            const { app, challengeStorage } = await createApp();

            const sessionId = getOrThrowTest(SessionId.from('session-wrong-challenge'));
            const correctChallenge = getOrThrowTest(Challenge.from('correct-challenge'));
            const wrongChallenge = getOrThrowTest(Challenge.from('wrong-challenge'));
            challengeStorage.storeChallenge(sessionId, correctChallenge);

            const response = await app.inject({
                method: 'POST',
                url: '/storage/register',
                payload: {
                    publicKey: publicKey1.toString(),
                    size: size100,
                    challenge: wrongChallenge.toString(),
                    sessionId: sessionId.toString(),
                    proof: getOrThrowTest(Proof.from('proof-wrong-challenge')).toString(),
                    certificateChain: {
                        deviceCert: DEVICE_CERT_OPTIGA,
                        caCert: CA_CERT_OPTIGA,
                    },
                    deviceModel: 'T2B1',
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('ChallengeValidationFailed');
        });

        it('returns 400 when challenge is reused', async () => {
            const { app, challengeStorage } = await createApp();

            const sessionId = getOrThrowTest(SessionId.from('session-reuse'));
            const challenge = getOrThrowTest(Challenge.from('challenge-reuse'));
            challengeStorage.storeChallenge(sessionId, challenge);

            const response1 = await app.inject({
                method: 'POST',
                url: '/storage/register',
                payload: {
                    publicKey: publicKey1.toString(),
                    size: size50,
                    challenge: challenge.toString(),
                    sessionId: sessionId.toString(),
                    proof: getOrThrowTest(Proof.from('proof-reuse-1')).toString(),
                    certificateChain: {
                        deviceCert: DEVICE_CERT_OPTIGA,
                        caCert: CA_CERT_OPTIGA,
                    },
                    deviceModel: 'T2B1',
                },
            });

            expect(response1.statusCode).toBe(200);

            const response2 = await app.inject({
                method: 'POST',
                url: '/storage/register',
                payload: {
                    publicKey: publicKey2.toString(),
                    size: size50,
                    challenge: challenge.toString(),
                    sessionId: sessionId.toString(),
                    proof: getOrThrowTest(Proof.from('proof-reuse-2')).toString(),
                    certificateChain: {
                        deviceCert: DEVICE_CERT_OPTIGA,
                        caCert: CA_CERT_OPTIGA,
                    },
                    deviceModel: 'T2B1',
                },
            });

            expect(response2.statusCode).toBe(400);
            const body = JSON.parse(response2.body);
            expect(body.error).toBe('ChallengeValidationFailed');
        });
    });

    describe('storage limit edge cases', () => {
        it('returns 400 when max storage per device is exceeded', async () => {
            const { app, challengeStorage } = await createApp({ maxStoragePerDevice: 100 });

            const sessionId1 = getOrThrowTest(SessionId.from('session-limit-1'));
            const challenge1 = getOrThrowTest(Challenge.from('challenge-limit-1'));
            challengeStorage.storeChallenge(sessionId1, challenge1);

            const response1 = await app.inject({
                method: 'POST',
                url: '/storage/register',
                payload: {
                    publicKey: publicKey1.toString(),
                    size: size50,
                    challenge: challenge1.toString(),
                    sessionId: sessionId1.toString(),
                    proof: getOrThrowTest(Proof.from('proof-limit-1')).toString(),
                    certificateChain: {
                        deviceCert: DEVICE_CERT_OPTIGA,
                        caCert: CA_CERT_OPTIGA,
                    },
                    deviceModel: 'T2B1',
                },
            });

            expect(response1.statusCode).toBe(200);

            const sessionId2 = getOrThrowTest(SessionId.from('session-limit-2'));
            const challenge2 = getOrThrowTest(Challenge.from('challenge-limit-2'));
            challengeStorage.storeChallenge(sessionId2, challenge2);

            const response2 = await app.inject({
                method: 'POST',
                url: '/storage/register',
                payload: {
                    publicKey: publicKey1.toString(),
                    size: size50,
                    challenge: challenge2.toString(),
                    sessionId: sessionId2.toString(),
                    proof: getOrThrowTest(Proof.from('proof-limit-2')).toString(),
                    certificateChain: {
                        deviceCert: DEVICE_CERT_OPTIGA,
                        caCert: CA_CERT_OPTIGA,
                    },
                    deviceModel: 'T2B1',
                },
            });

            expect(response2.statusCode).toBe(200);

            const sessionId3 = getOrThrowTest(SessionId.from('session-limit-3'));
            const challenge3 = getOrThrowTest(Challenge.from('challenge-limit-3'));
            challengeStorage.storeChallenge(sessionId3, challenge3);

            const response3 = await app.inject({
                method: 'POST',
                url: '/storage/register',
                payload: {
                    publicKey: publicKey1.toString(),
                    size: size50,
                    challenge: challenge3.toString(),
                    sessionId: sessionId3.toString(),
                    proof: getOrThrowTest(Proof.from('proof-limit-3')).toString(),
                    certificateChain: {
                        deviceCert: DEVICE_CERT_OPTIGA,
                        caCert: CA_CERT_OPTIGA,
                    },
                    deviceModel: 'T2B1',
                },
            });

            expect(response3.statusCode).toBe(400);
            const body = JSON.parse(response3.body);
            expect(body.error).toBe('StorageLimitExceeded');
        });
    });

    describe('schema validation', () => {
        it('returns 400 when schema validation fails', async () => {
            const { app } = await createApp();

            const response = await app.inject({
                method: 'POST',
                url: '/storage/register',
                payload: {
                    publicKey: publicKey1.toString(),
                },
            });

            expect(response.statusCode).toBe(400);
        });
    });
});
