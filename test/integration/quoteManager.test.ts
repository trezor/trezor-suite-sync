import { OwnerId } from '@evolu/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getOrThrowTest } from '../../src/getOrThrowTest.js';
import { SessionId } from '../../src/storage/challengeStorage/challengeStorage.js';
import {
    Proof,
    PublicKey,
    Size,
} from '../../src/storage/limitStorage/limitStorage.js';
import { CA_CERT_OPTIGA, DEVICE_CERT_OPTIGA } from '../mocks/certificates.js';
import {
    askSpace,
    assignSpace,
    createApp,
    deleteOwner,
    getChallenge,
    registerDevice,
} from '../utils/quotaManagerHelpers.js';

const mockVerifyAuthenticityProof = vi.fn();
const mockDeleteOwnerOnEvoluRelay = vi.fn();

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

const publicKey1 = getOrThrowTest(
    PublicKey.from('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'),
);
const publicKey2 = getOrThrowTest(
    PublicKey.from('b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3'),
);
const ownerId1 = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJg6g'));
const ownerId2 = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJg7g'));
const ownerId3 = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJg8g'));
const ownerIdZero = getOrThrowTest(OwnerId.from('AAAAAAAAAAAAAAAAAAAAAA'));
const size50 = getOrThrowTest(Size.from(50));
const size100 = getOrThrowTest(Size.from(100));
const size200 = getOrThrowTest(Size.from(200));

describe('Quota Manager API Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockVerifyAuthenticityProof.mockResolvedValue({
            valid: true,
            caPubKey: 'test-ca-pubkey',
            rootPubKey: 'test-root-pubkey',
        });
        mockDeleteOwnerOnEvoluRelay.mockResolvedValue({ success: true });
    });

    describe('Full flow: Challenge -> Register -> Add -> Ask', () => {
        it('completes full registration and space assignment flow', async () => {
            const { server, challengeStorage } = await createApp();

            const sessionId = getOrThrowTest(SessionId.from('session-full-flow'));
            const challenge = await getChallenge(server, sessionId);
            expect(challenge).toBeDefined();

            const registerResult = await registerDevice(server, challengeStorage, publicKey1, size100);
            expect(registerResult.totalStorageSize).toBe(size100);
            expect(registerResult.unspendStorageSize).toBe(size100);

            const assignResult = await assignSpace(server, publicKey1, ownerId1, size50);
            expect(assignResult.storageLimit).toBe(size50);

            const ownerSpace = await askSpace(server, { ownerId: ownerId1 });
            expect(ownerSpace.totalSpace).toBe(size50);

            const deviceSpace = await askSpace(server, { publicKey: publicKey1 });
            expect(deviceSpace.totalSpace).toBe(size100);
            expect(deviceSpace.unspentSpace).toBe(size50);
        });

        it('handles multiple owners from same device', async () => {
            const { server, challengeStorage } = await createApp();

            await registerDevice(server, challengeStorage, publicKey1, size200);

            const assign1 = await assignSpace(server, publicKey1, ownerId1, size50);
            expect(assign1.storageLimit).toBe(size50);

            const assign2 = await assignSpace(server, publicKey1, ownerId2, size50);
            expect(assign2.storageLimit).toBe(size50);

            const deviceSpace = await askSpace(server, { publicKey: publicKey1 });
            expect(deviceSpace.totalSpace).toBe(size200);
            expect(deviceSpace.unspentSpace).toBe(size100);

            const owner1Space = await askSpace(server, { ownerId: ownerId1 });
            expect(owner1Space.totalSpace).toBe(size50);

            const owner2Space = await askSpace(server, { ownerId: ownerId2 });
            expect(owner2Space.totalSpace).toBe(size50);
        });

        it('handles incremental space assignment to same owner', async () => {
            const { server, challengeStorage } = await createApp();

            await registerDevice(server, challengeStorage, publicKey1, size200);

            const assign1 = await assignSpace(server, publicKey1, ownerId1, size50);
            expect(assign1.storageLimit).toBe(size50);

            const assign2 = await assignSpace(server, publicKey1, ownerId1, size50);
            expect(assign2.storageLimit).toBe(size100);

            const ownerSpace = await askSpace(server, { ownerId: ownerId1 });
            expect(ownerSpace.totalSpace).toBe(size100);
        });
    });

    describe('Device Registration Flow', () => {
        it('allows incremental registration for same device', async () => {
            const { server, challengeStorage } = await createApp();

            const result1 = await registerDevice(server, challengeStorage, publicKey1, size50);
            expect(result1.totalStorageSize).toBe(size50);
            expect(result1.unspendStorageSize).toBe(size50);

            const result2 = await registerDevice(server, challengeStorage, publicKey1, size50);
            expect(result2.totalStorageSize).toBe(size100);
            expect(result2.unspendStorageSize).toBe(size100);
        });

        it('allows multiple different devices to register independently', async () => {
            const { server, challengeStorage } = await createApp();

            const result1 = await registerDevice(server, challengeStorage, publicKey1, size100);
            expect(result1.totalStorageSize).toBe(size100);

            const result2 = await registerDevice(server, challengeStorage, publicKey2, size100);
            expect(result2.totalStorageSize).toBe(size100);

            const device1Space = await askSpace(server, { publicKey: publicKey1 });
            expect(device1Space.totalSpace).toBe(size100);
            expect(device1Space.unspentSpace).toBe(size100);

            const device2Space = await askSpace(server, { publicKey: publicKey2 });
            expect(device2Space.totalSpace).toBe(size100);
            expect(device2Space.unspentSpace).toBe(size100);
        });

        it('enforces max storage per device limit', async () => {
            const { server, challengeStorage } = await createApp({ maxStoragePerDevice: 100 });

            await registerDevice(server, challengeStorage, publicKey1, size50);
            await registerDevice(server, challengeStorage, publicKey1, size50);

            const sessionId = getOrThrowTest(SessionId.from('session-limit-exceeded'));
            const challenge = await getChallenge(server, sessionId);

            const response = await server.inject({
                method: 'POST',
                url: '/storage/register',
                payload: {
                    publicKey: publicKey1.toString(),
                    size: size50,
                    challenge: challenge.toString(),
                    sessionId: sessionId.toString(),
                    proof: getOrThrowTest(Proof.from('proof-limit')).toString(),
                    certificateChain: {
                        deviceCert: DEVICE_CERT_OPTIGA,
                        caCert: CA_CERT_OPTIGA,
                    },
                    deviceModel: 'T2B1',
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('StorageLimitExceeded');
        });

        it('validates certificate chain during registration', async () => {
            const { server } = await createApp();

            mockVerifyAuthenticityProof.mockResolvedValueOnce({
                valid: false,
                error: 'Invalid certificate chain',
            });

            const sessionId = getOrThrowTest(SessionId.from('session-invalid-cert'));
            const challenge = await getChallenge(server, sessionId);

            const response = await server.inject({
                method: 'POST',
                url: '/storage/register',
                payload: {
                    publicKey: publicKey1.toString(),
                    size: size100,
                    challenge: challenge.toString(),
                    sessionId: sessionId.toString(),
                    proof: getOrThrowTest(Proof.from('invalid-proof')).toString(),
                    certificateChain: {
                        deviceCert: 'invalid-cert',
                        caCert: 'invalid-ca',
                    },
                    deviceModel: 'T2B1',
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('ProofValidationFailed');
        });
    });

    describe('Space Assignment Flow', () => {
        it('prevents assignment when device has insufficient unspent space', async () => {
            const { server, challengeStorage } = await createApp();

            await registerDevice(server, challengeStorage, publicKey1, size50);

            const response = await server.inject({
                method: 'POST',
                url: '/storage/add',
                payload: {
                    publicKey: publicKey1.toString(),
                    ownerId: ownerId1.toString(),
                    size: size100,
                    proof: getOrThrowTest(Proof.from('proof-insufficient')).toString(),
                    timestamp: Date.now(),
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('NoStorageAllowance');
        });

        it('prevents assignment when publicKey is unknown', async () => {
            const { server } = await createApp();

            const response = await server.inject({
                method: 'POST',
                url: '/storage/add',
                payload: {
                    publicKey: publicKey2.toString(),
                    ownerId: ownerId1.toString(),
                    size: size50,
                    proof: getOrThrowTest(Proof.from('proof-unknown')).toString(),
                    timestamp: Date.now(),
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('NoStorageAllowance');
        });

        it('allows partial space assignment', async () => {
            const { server, challengeStorage } = await createApp();

            await registerDevice(server, challengeStorage, publicKey1, size200);
            await assignSpace(server, publicKey1, ownerId1, size50);

            const deviceSpace = await askSpace(server, { publicKey: publicKey1 });
            expect(deviceSpace.unspentSpace).toBe(150);
        });

        it('allows burning space with ownerId = 0 for plausible deniability', async () => {
            const { server, challengeStorage } = await createApp();

            await registerDevice(server, challengeStorage, publicKey1, size200);

            const burnResult = await assignSpace(server, publicKey1, ownerIdZero, size50);
            // When ownerId is 0, space is burned - handler returns storageLimit with the size
            expect(burnResult.storageLimit).toBe(size50);

            const deviceSpace = await askSpace(server, { publicKey: publicKey1 });
            expect(deviceSpace.unspentSpace).toBe(150);

            // When ownerId is 0, a record is still created (space is "burned" but stored)
            const response = await server.inject({
                method: 'GET',
                url: `/storage/ask?ownerId=${encodeURIComponent(ownerIdZero.toString())}`,
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.totalSpace).toBe(size50);
        });
    });

    describe('Challenge Flow', () => {
        it('generates unique challenges for different sessions', async () => {
            const { server } = await createApp();

            const sessionId1 = getOrThrowTest(SessionId.from('session-1'));
            const sessionId2 = getOrThrowTest(SessionId.from('session-2'));

            const challenge1 = await getChallenge(server, sessionId1);
            const challenge2 = await getChallenge(server, sessionId2);

            expect(challenge1.toString()).not.toBe(challenge2.toString());
        });

        it('generates different challenges for same session on multiple calls', async () => {
            const { server } = await createApp();

            const sessionId = getOrThrowTest(SessionId.from('session-repeated'));

            const challenge1 = await getChallenge(server, sessionId);
            const challenge2 = await getChallenge(server, sessionId);

            expect(challenge1.toString()).not.toBe(challenge2.toString());
        });

        it('validates challenge is consumed after registration', async () => {
            const { server } = await createApp();

            const sessionId = getOrThrowTest(SessionId.from('session-consume'));
            const challenge = await getChallenge(server, sessionId);

            const response1 = await server.inject({
                method: 'POST',
                url: '/storage/register',
                payload: {
                    publicKey: publicKey1.toString(),
                    size: size100,
                    challenge: challenge.toString(),
                    sessionId: sessionId.toString(),
                    proof: getOrThrowTest(Proof.from('proof-1')).toString(),
                    certificateChain: {
                        deviceCert: DEVICE_CERT_OPTIGA,
                        caCert: CA_CERT_OPTIGA,
                    },
                    deviceModel: 'T2B1',
                },
            });

            expect(response1.statusCode).toBe(200);

            const response2 = await server.inject({
                method: 'POST',
                url: '/storage/register',
                payload: {
                    publicKey: publicKey2.toString(),
                    size: size50,
                    challenge: challenge.toString(),
                    sessionId: sessionId.toString(),
                    proof: getOrThrowTest(Proof.from('proof-reuse')).toString(),
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

        it.skip('requires valid challenge for space assignment', async () => {
            const { server, challengeStorage } = await createApp();

            await registerDevice(server, challengeStorage, publicKey1, size200);

            const response = await server.inject({
                method: 'POST',
                url: '/storage/add',
                payload: {
                    publicKey: publicKey1.toString(),
                    ownerId: ownerId1.toString(),
                    size: size50,
                    challenge: 'invalid-challenge',
                    sessionId: 'invalid-session',
                    proof: getOrThrowTest(Proof.from('proof-no-challenge')).toString(),
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('ChallengeValidationFailed');
        });

        it.skip('consumes challenge after space assignment', async () => {
            const { server, challengeStorage } = await createApp();

            await registerDevice(server, challengeStorage, publicKey1, size200);

            const sessionId = getOrThrowTest(SessionId.from('session-consume-add'));
            const challenge = await getChallenge(server, sessionId);

            const response1 = await server.inject({
                method: 'POST',
                url: '/storage/add',
                payload: {
                    publicKey: publicKey1.toString(),
                    ownerId: ownerId1.toString(),
                    size: size50,
                    challenge: challenge.toString(),
                    sessionId: sessionId.toString(),
                    proof: getOrThrowTest(Proof.from('proof-1')).toString(),
                },
            });

            expect(response1.statusCode).toBe(200);

            const response2 = await server.inject({
                method: 'POST',
                url: '/storage/add',
                payload: {
                    publicKey: publicKey1.toString(),
                    ownerId: ownerId2.toString(),
                    size: size50,
                    challenge: challenge.toString(),
                    sessionId: sessionId.toString(),
                    proof: getOrThrowTest(Proof.from('proof-reuse')).toString(),
                },
            });

            expect(response2.statusCode).toBe(400);
            const body = JSON.parse(response2.body);
            expect(body.error).toBe('ChallengeValidationFailed');
        });
    });

    describe('Owner Deletion Flow', () => {
        it.skip('deletes owner and loses freed space when no recipient specified', async () => {
            const { server, challengeStorage } = await createApp();

            await registerDevice(server, challengeStorage, publicKey1, size200);
            await assignSpace(server, publicKey1, ownerId1, size50);

            const ownerSpaceBefore = await askSpace(server, { ownerId: ownerId1 });
            expect(ownerSpaceBefore.totalSpace).toBe(size50);

            const deleteResult = await deleteOwner(server, ownerId1);
            expect(deleteResult).toBeDefined();

            expect(mockDeleteOwnerOnEvoluRelay).toHaveBeenCalledWith(ownerId1.toString());

            const response = await server.inject({
                method: 'GET',
                url: `/storage/ask?ownerId=${encodeURIComponent(ownerId1.toString())}`,
            });
            expect(response.statusCode).toBe(400);

            const deviceSpace = await askSpace(server, { publicKey: publicKey1 });
            expect(deviceSpace.unspentSpace).toBe(150);
        });

        it.skip('deletes owner and returns freed space to device unspent space', async () => {
            const { server, challengeStorage } = await createApp();

            await registerDevice(server, challengeStorage, publicKey1, size200);
            await assignSpace(server, publicKey1, ownerId1, size50);

            const deleteResult = await deleteOwner(server, ownerId1, { publicKey: publicKey1 });
            expect(deleteResult.unspentSpace).toBe(200);

            expect(mockDeleteOwnerOnEvoluRelay).toHaveBeenCalledWith(ownerId1.toString());

            const deviceSpace = await askSpace(server, { publicKey: publicKey1 });
            expect(deviceSpace.unspentSpace).toBe(200);
            expect(deviceSpace.totalSpace).toBe(200);

            const response = await server.inject({
                method: 'GET',
                url: `/storage/ask?ownerId=${encodeURIComponent(ownerId1.toString())}`,
            });
            expect(response.statusCode).toBe(400);
        });

        it.skip('deletes owner and transfers freed space to recipient owner', async () => {
            const { server, challengeStorage } = await createApp();

            await registerDevice(server, challengeStorage, publicKey1, size200);
            await assignSpace(server, publicKey1, ownerId1, size50);
            await assignSpace(server, publicKey1, ownerId2, size50);

            const owner1Before = await askSpace(server, { ownerId: ownerId1 });
            expect(owner1Before.totalSpace).toBe(size50);

            const owner2Before = await askSpace(server, { ownerId: ownerId2 });
            expect(owner2Before.totalSpace).toBe(size50);

            const deleteResult = await deleteOwner(server, ownerId1, { recipientOwnerId: ownerId2 });
            expect(deleteResult.totalSpace).toBe(size100);

            expect(mockDeleteOwnerOnEvoluRelay).toHaveBeenCalledWith(ownerId1.toString());

            const response1 = await server.inject({
                method: 'GET',
                url: `/storage/ask?ownerId=${encodeURIComponent(ownerId1.toString())}`,
            });
            expect(response1.statusCode).toBe(400);

            const owner2After = await askSpace(server, { ownerId: ownerId2 });
            expect(owner2After.totalSpace).toBe(size100);

            const deviceSpace = await askSpace(server, { publicKey: publicKey1 });
            expect(deviceSpace.unspentSpace).toBe(size100);
        });

        it.skip('allows deleting owner and reassigning to same ownerId for history squashing', async () => {
            const { server, challengeStorage } = await createApp();

            await registerDevice(server, challengeStorage, publicKey1, size200);
            await assignSpace(server, publicKey1, ownerId1, size50);

            const deleteResult = await deleteOwner(server, ownerId1, { recipientOwnerId: ownerId1 });
            expect(deleteResult.totalSpace).toBe(size50);

            expect(mockDeleteOwnerOnEvoluRelay).toHaveBeenCalledWith(ownerId1.toString());

            const ownerSpace = await askSpace(server, { ownerId: ownerId1 });
            expect(ownerSpace.totalSpace).toBe(size50);
        });

        it('fails to delete non-existent owner', async () => {
            const { server } = await createApp();

            const response = await server.inject({
                method: 'POST',
                url: '/storage/delete',
                payload: {
                    ownerId: ownerId1.toString(),
                },
            });

            expect(response.statusCode).toBe(404);

            expect(mockDeleteOwnerOnEvoluRelay).not.toHaveBeenCalled();
        });
    });

    describe('Space Query Flow', () => {
        it('returns 400 when querying unknown ownerId', async () => {
            const { server } = await createApp();

            const response = await server.inject({
                method: 'GET',
                url: `/storage/ask?ownerId=${encodeURIComponent(ownerId1.toString())}`,
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('OwnerNotFound');
        });

        it('returns 404 when querying unknown publicKey', async () => {
            const { server } = await createApp();

            const response = await server.inject({
                method: 'GET',
                url: `/storage/ask?publicKey=${encodeURIComponent(publicKey1.toString())}`,
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('Public key not found');
        });

        it('returns 400 when neither ownerId nor publicKey is provided', async () => {
            const { server } = await createApp();

            const response = await server.inject({
                method: 'GET',
                url: '/storage/ask',
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('Either ownerId or publicKey is required');
        });
    });

    describe('Sync Endpoint', () => {
        it('returns NotImplemented for sync endpoint', async () => {
            const { server } = await createApp();

            const response = await server.inject({
                method: 'GET',
                url: `/sync?ownerId=${encodeURIComponent(ownerId1.toString())}`,
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('NotImplemented');
        });
    });

    describe('Proof Signature Validation', () => {
        it('validates registration proof signature verification is called', async () => {
            const { server } = await createApp();

            const sessionId = getOrThrowTest(SessionId.from('session-proof-validation'));
            const challenge = await getChallenge(server, sessionId);

            const response = await server.inject({
                method: 'POST',
                url: '/storage/register',
                payload: {
                    publicKey: publicKey1.toString(),
                    size: size100,
                    challenge: challenge.toString(),
                    sessionId: sessionId.toString(),
                    proof: getOrThrowTest(Proof.from('valid-proof-signature')).toString(),
                    certificateChain: {
                        deviceCert: DEVICE_CERT_OPTIGA,
                        caCert: CA_CERT_OPTIGA,
                    },
                    deviceModel: 'T2B1',
                },
            });

            expect(response.statusCode).toBe(200);
            expect(mockVerifyAuthenticityProof).toHaveBeenCalled();
        });

        it.skip('validates add space proof signature verification is called', async () => {
            const { server, challengeStorage } = await createApp();

            await registerDevice(server, challengeStorage, publicKey1, size200);

            const sessionId = getOrThrowTest(SessionId.from('session-add-proof-validation'));
            const challenge = await getChallenge(server, sessionId);

            vi.mocked(globalThis.crypto.subtle.verify).mockResolvedValue(true);

            const response = await server.inject({
                method: 'POST',
                url: '/storage/add',
                payload: {
                    publicKey: publicKey1.toString(),
                    ownerId: ownerId1.toString(),
                    size: size50,
                    challenge: challenge.toString(),
                    sessionId: sessionId.toString(),
                    proof: getOrThrowTest(Proof.from('valid-add-proof-signature')).toString(),
                },
            });

            expect(response.statusCode).toBe(200);
            expect(globalThis.crypto.subtle.verify).toHaveBeenCalled();
        });

        it('rejects invalid proof signature for registration', async () => {
            const { server } = await createApp();

            mockVerifyAuthenticityProof.mockResolvedValueOnce({
                valid: false,
                error: 'Invalid signature',
            });

            const sessionId = getOrThrowTest(SessionId.from('session-invalid-proof'));
            const challenge = await getChallenge(server, sessionId);

            const response = await server.inject({
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

        it.skip('rejects invalid proof signature for space assignment', async () => {
            const { server, challengeStorage } = await createApp();

            await registerDevice(server, challengeStorage, publicKey1, size200);

            const sessionId = getOrThrowTest(SessionId.from('session-invalid-add-proof'));
            const challenge = await getChallenge(server, sessionId);

            vi.mocked(globalThis.crypto.subtle.verify).mockResolvedValueOnce(false);

            const response = await server.inject({
                method: 'POST',
                url: '/storage/add',
                payload: {
                    publicKey: publicKey1.toString(),
                    ownerId: ownerId1.toString(),
                    size: size50,
                    challenge: challenge.toString(),
                    sessionId: sessionId.toString(),
                    proof: getOrThrowTest(Proof.from('invalid-add-signature')).toString(),
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.error).toBe('ProofVerificationFailed');
        });
    });

    describe('Complex Scenarios', () => {
        it('handles complete lifecycle: register -> assign -> query multiple owners', async () => {
            const { server, challengeStorage } = await createApp();

            await registerDevice(server, challengeStorage, publicKey1, size200);

            await assignSpace(server, publicKey1, ownerId1, size50);
            await assignSpace(server, publicKey1, ownerId2, size50);
            await assignSpace(server, publicKey1, ownerId3, size50);

            const owner1Space = await askSpace(server, { ownerId: ownerId1 });
            expect(owner1Space.totalSpace).toBe(size50);

            const owner2Space = await askSpace(server, { ownerId: ownerId2 });
            expect(owner2Space.totalSpace).toBe(size50);

            const owner3Space = await askSpace(server, { ownerId: ownerId3 });
            expect(owner3Space.totalSpace).toBe(size50);

            const deviceSpace = await askSpace(server, { publicKey: publicKey1 });
            expect(deviceSpace.totalSpace).toBe(size200);
            expect(deviceSpace.unspentSpace).toBe(size50);
        });

        it('handles multiple devices with multiple owners each', async () => {
            const { server, challengeStorage } = await createApp();

            await registerDevice(server, challengeStorage, publicKey1, size200);
            await registerDevice(server, challengeStorage, publicKey2, size200);

            await assignSpace(server, publicKey1, ownerId1, size50);
            await assignSpace(server, publicKey1, ownerId2, size50);
            await assignSpace(server, publicKey2, ownerId3, size100);

            const device1Space = await askSpace(server, { publicKey: publicKey1 });
            expect(device1Space.unspentSpace).toBe(size100);

            const device2Space = await askSpace(server, { publicKey: publicKey2 });
            expect(device2Space.unspentSpace).toBe(size100);

            const owner1Space = await askSpace(server, { ownerId: ownerId1 });
            expect(owner1Space.totalSpace).toBe(size50);

            const owner2Space = await askSpace(server, { ownerId: ownerId2 });
            expect(owner2Space.totalSpace).toBe(size50);

            const owner3Space = await askSpace(server, { ownerId: ownerId3 });
            expect(owner3Space.totalSpace).toBe(size100);
        });

        it.skip('handles complex space recycling through deletions', async () => {
            const { server, challengeStorage } = await createApp();

            await registerDevice(server, challengeStorage, publicKey1, size200);

            await assignSpace(server, publicKey1, ownerId1, size50);
            await assignSpace(server, publicKey1, ownerId2, size50);

            let deviceSpace = await askSpace(server, { publicKey: publicKey1 });
            expect(deviceSpace.unspentSpace).toBe(size100);

            await deleteOwner(server, ownerId1, { publicKey: publicKey1 });

            deviceSpace = await askSpace(server, { publicKey: publicKey1 });
            expect(deviceSpace.unspentSpace).toBe(150);

            await assignSpace(server, publicKey1, ownerId3, size100);

            deviceSpace = await askSpace(server, { publicKey: publicKey1 });
            expect(deviceSpace.unspentSpace).toBe(size50);

            const owner2Space = await askSpace(server, { ownerId: ownerId2 });
            expect(owner2Space.totalSpace).toBe(size50);

            const owner3Space = await askSpace(server, { ownerId: ownerId3 });
            expect(owner3Space.totalSpace).toBe(size100);
        });

        it.skip('handles burning space and space recycling scenario', async () => {
            const { server, challengeStorage } = await createApp();

            await registerDevice(server, challengeStorage, publicKey1, size200);

            await assignSpace(server, publicKey1, ownerIdZero, size50);
            await assignSpace(server, publicKey1, ownerId1, size50);

            let deviceSpace = await askSpace(server, { publicKey: publicKey1 });
            expect(deviceSpace.unspentSpace).toBe(size100);

            await deleteOwner(server, ownerId1, { publicKey: publicKey1 });

            deviceSpace = await askSpace(server, { publicKey: publicKey1 });
            expect(deviceSpace.unspentSpace).toBe(150);
        });

        it.skip('handles space transfer between owners through deletion', async () => {
            const { server, challengeStorage } = await createApp();

            await registerDevice(server, challengeStorage, publicKey1, size200);

            await assignSpace(server, publicKey1, ownerId1, size50);
            await assignSpace(server, publicKey1, ownerId2, size50);
            await assignSpace(server, publicKey1, ownerId3, size50);

            await deleteOwner(server, ownerId1, { recipientOwnerId: ownerId2 });

            const owner2Space = await askSpace(server, { ownerId: ownerId2 });
            expect(owner2Space.totalSpace).toBe(size100);

            await deleteOwner(server, ownerId3, { recipientOwnerId: ownerId2 });

            const owner2SpaceFinal = await askSpace(server, { ownerId: ownerId2 });
            expect(owner2SpaceFinal.totalSpace).toBe(150);

            const deviceSpace = await askSpace(server, { publicKey: publicKey1 });
            expect(deviceSpace.unspentSpace).toBe(size50);
        });

        it.skip('handles mixed operations: burn, assign, delete, reassign', async () => {
            const { server, challengeStorage } = await createApp();

            await registerDevice(server, challengeStorage, publicKey1, size200);

            await assignSpace(server, publicKey1, ownerIdZero, size50);

            let deviceSpace = await askSpace(server, { publicKey: publicKey1 });
            expect(deviceSpace.unspentSpace).toBe(150);

            await assignSpace(server, publicKey1, ownerId1, size50);
            await assignSpace(server, publicKey1, ownerId2, size50);

            deviceSpace = await askSpace(server, { publicKey: publicKey1 });
            expect(deviceSpace.unspentSpace).toBe(size50);

            await deleteOwner(server, ownerId1, { publicKey: publicKey1 });

            deviceSpace = await askSpace(server, { publicKey: publicKey1 });
            expect(deviceSpace.unspentSpace).toBe(size100);

            await assignSpace(server, publicKey1, ownerId3, size100);

            deviceSpace = await askSpace(server, { publicKey: publicKey1 });
            expect(deviceSpace.unspentSpace).toBe(0);

            const owner2Space = await askSpace(server, { ownerId: ownerId2 });
            expect(owner2Space.totalSpace).toBe(size50);

            const owner3Space = await askSpace(server, { ownerId: ownerId3 });
            expect(owner3Space.totalSpace).toBe(size100);
        });
    });
});

