import { OwnerId } from '@evolu/common';
import { assert, beforeEach, describe, expect, it, vi } from 'vitest';

import { getOrThrowTest } from '../../src/getOrThrowTest.js';
import {
    Challenge,
    SessionId,
} from '../../src/storage/challengeStorage/createChallengeStorage.js';
import { PublicKey } from '../../src/storage/limitStorage/limitStorage.js';
import { OWNER_ID_BURN } from '../../src/storage/limitStorage/methods/createAssignSpaceToOwner.js';
import { CA_CERT_OPTIGA, DEVICE_CERT_OPTIGA } from '../mocks/certificates.js';
import {
    TestAppDeps,
    addSpaceToOwner,
    createChallenge,
    createTestApp,
    registerDevice,
} from '../utils/quotaManagerHelpers.js';

// Mock the device authenticity verification
const { T2B1rootPubKeyOptiga } = vi.hoisted(() => ({
    T2B1rootPubKeyOptiga:
        '04626d58aca84f0fcb52ea63f0eb08de1067b8d406574a715d5e7928f4b67f113a00fb5c5918e74d2327311946c446b242c20fe7347482999bdc1e229b94e27d96',
}));

vi.mock('@trezor/device-authenticity', () => ({
    verifyAuthenticityProof: vi.fn().mockResolvedValue({
        valid: true,
        caPubKey: 'test-ca-pubkey',
        rootPubKey: T2B1rootPubKeyOptiga,
    }),
    verifySignatureP256: vi.fn().mockResolvedValue(true),
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

describe('Quota Manager Integration Tests', () => {
    let testApp: TestAppDeps;

    beforeEach(async () => {
        testApp = await createTestApp();
    });

    describe('Challenge Creation', () => {
        it('should create a challenge with sessionId and challenge', async () => {
            const { challenge, sessionId } = await createChallenge(testApp.app);

            expect(sessionId).toBeDefined();
            expect(challenge).toBeDefined();
            expect(typeof sessionId).toBe('string');
            expect(typeof challenge).toBe('string');
            expect(sessionId.length).toBeGreaterThan(0);
            expect(challenge.length).toBeGreaterThan(0);
        });

        it('should create unique challenges on subsequent calls', async () => {
            const first = await createChallenge(testApp.app);
            const second = await createChallenge(testApp.app);

            expect(first.sessionId).not.toBe(second.sessionId);
            expect(first.challenge).not.toBe(second.challenge);
        });
    });

    describe('Device Registration', () => {
        it('should register a new device with storage quota', async () => {
            const publicKey = getOrThrowTest(PublicKey.from('test-pubkey-001'));
            const size = 100;

            const result = await registerDevice({
                app: testApp.app,
                storeChallenge: testApp.storeChallenge,
                publicKey,
                size,
            });

            expect(result.totalStorageSize).toBe(size);
            expect(result.unspentStorageSize).toBe(size);
        });

        it('should accumulate storage when device registers multiple times', async () => {
            const publicKey = getOrThrowTest(PublicKey.from('test-pubkey-002'));

            const first = await registerDevice({
                app: testApp.app,
                storeChallenge: testApp.storeChallenge,
                publicKey,
                size: 100,
            });
            expect(first.totalStorageSize).toBe(100);
            expect(first.unspentStorageSize).toBe(100);

            const second = await registerDevice({
                app: testApp.app,
                storeChallenge: testApp.storeChallenge,
                publicKey,
                size: 50,
            });
            expect(second.totalStorageSize).toBe(150);
            expect(second.unspentStorageSize).toBe(150);
        });

        it('should fail registration without a valid challenge', async () => {
            const publicKey = getOrThrowTest(PublicKey.from('test-pubkey-003'));
            const sessionId = getOrThrowTest(SessionId.from('invalid-session'));
            const challenge = getOrThrowTest(Challenge.from('invalid-challenge'));

            const response = await testApp.app.inject({
                method: 'POST',
                url: '/storage/register',
                payload: {
                    publicKey,
                    size: 100,
                    challenge,
                    sessionId,
                    proof: 'mock-proof',
                    certificateChain: {
                        deviceCert: DEVICE_CERT_OPTIGA,
                        caCert: CA_CERT_OPTIGA,
                    },
                    deviceModel: 'T2B1',
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body) as { error: string };
            expect(body.error).toBe('ChallengeValidationFailed');
        });
    });

    describe('Storage Ask (Query)', () => {
        it('should return storage info for a registered device by publicKey', async () => {
            const publicKey = getOrThrowTest(PublicKey.from('test-pubkey-ask-001'));
            const size = 200;

            await registerDevice({
                app: testApp.app,
                storeChallenge: testApp.storeChallenge,
                publicKey,
                size,
            });

            const response = await testApp.app.inject({
                method: 'POST',
                url: '/storage/ask',
                payload: { publicKey },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body) as {
                totalSpace: number;
                unspentSpace: number;
            };
            expect(body.totalSpace).toBe(size);
            expect(body.unspentSpace).toBe(size);
        });

        it('should return storage info for an owner by ownerId', async () => {
            const publicKey = getOrThrowTest(PublicKey.from('test-pubkey-ask-002'));
            const ownerId = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJg7g'));

            // Register device and add space to owner
            await registerDevice({
                app: testApp.app,
                storeChallenge: testApp.storeChallenge,
                publicKey,
                size: 300,
            });

            await addSpaceToOwner({
                app: testApp.app,
                storeChallenge: testApp.storeChallenge,
                publicKey,
                ownerId,
                size: 150,
            });

            const response = await testApp.app.inject({
                method: 'POST',
                url: '/storage/ask',
                payload: { ownerId },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body) as {
                totalSpace: number;
            };
            expect(body.totalSpace).toBe(150);
        });

        it('should return error when neither publicKey nor ownerId is provided', async () => {
            const response = await testApp.app.inject({
                method: 'POST',
                url: '/storage/ask',
                payload: {},
            });

            expect(response.statusCode).toBe(400);
        });

        it('should return 404 for non-existent publicKey', async () => {
            const publicKey = getOrThrowTest(PublicKey.from('non-existent-pubkey'));

            const response = await testApp.app.inject({
                method: 'POST',
                url: '/storage/ask',
                payload: { publicKey },
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.body) as { error: string };
            expect(body.error).toBe('Public key not found');
        });

        it('should return 404 for non-existent ownerId', async () => {
            const ownerId = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJg8g'));

            const response = await testApp.app.inject({
                method: 'POST',
                url: '/storage/ask',
                payload: { ownerId },
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.body) as { error: string };
            expect(body.error).toBe('OwnerNotFound');
        });
    });

    describe('Add Space to Owner', () => {
        it('should assign device storage to an owner', async () => {
            const publicKey = getOrThrowTest(PublicKey.from('test-pubkey-add-001'));
            const ownerId = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJg9g'));
            const deviceSize = 500;
            const assignedSize = 200;

            // Register device first
            await registerDevice({
                app: testApp.app,
                storeChallenge: testApp.storeChallenge,
                publicKey,
                size: deviceSize,
            });

            // Assign space to owner
            const result = await addSpaceToOwner({
                app: testApp.app,
                storeChallenge: testApp.storeChallenge,
                publicKey,
                ownerId,
                size: assignedSize,
            });

            expect(result.publicKeyUnspentSpace).toBe(deviceSize - assignedSize);
            expect(result.ownerTotalSpace).toBe(assignedSize);
        });

        it('should accumulate space when adding to the same owner multiple times', async () => {
            const publicKey = getOrThrowTest(PublicKey.from('test-pubkey-add-002'));
            const ownerId = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJgAg'));

            await registerDevice({
                app: testApp.app,
                storeChallenge: testApp.storeChallenge,
                publicKey,
                size: 1000,
            });

            const first = await addSpaceToOwner({
                app: testApp.app,
                storeChallenge: testApp.storeChallenge,
                publicKey,
                ownerId,
                size: 300,
            });
            expect(first.ownerTotalSpace).toBe(300);
            expect(first.publicKeyUnspentSpace).toBe(700);

            const second = await addSpaceToOwner({
                app: testApp.app,
                storeChallenge: testApp.storeChallenge,
                publicKey,
                ownerId,
                size: 200,
            });
            expect(second.ownerTotalSpace).toBe(500);
            expect(second.publicKeyUnspentSpace).toBe(500);
        });

        it('should allow burning storage by assigning to OWNER_ID_BURN', async () => {
            const publicKey = getOrThrowTest(PublicKey.from('test-pubkey-burn-001'));
            const deviceSize = 400;
            const burnSize = 100;

            await registerDevice({
                app: testApp.app,
                storeChallenge: testApp.storeChallenge,
                publicKey,
                size: deviceSize,
            });

            const result = await addSpaceToOwner({
                app: testApp.app,
                storeChallenge: testApp.storeChallenge,
                publicKey,
                ownerId: OWNER_ID_BURN,
                size: burnSize,
            });

            expect(result.publicKeyUnspentSpace).toBe(deviceSize - burnSize);
            expect(result.ownerTotalSpace).toBeNull();
        });

        it('should fail when device has insufficient unspent storage', async () => {
            const publicKey = getOrThrowTest(PublicKey.from('test-pubkey-add-003'));
            const ownerId = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJgBg'));

            await registerDevice({
                app: testApp.app,
                storeChallenge: testApp.storeChallenge,
                publicKey,
                size: 100,
            });

            const sessionId: SessionId = getOrThrowTest(
                SessionId.from(`session-add-fail-${publicKey}`),
            );
            const challenge: Challenge = getOrThrowTest(
                Challenge.from(`challenge-add-fail-${publicKey}`),
            );

            const storeResult = await testApp.storeChallenge({ sessionId, challenge });
            assert(storeResult.ok);

            const response = await testApp.app.inject({
                method: 'POST',
                url: '/storage/add',
                payload: {
                    publicKey,
                    ownerId,
                    size: 200, // More than available
                    challenge,
                    sessionId,
                    proof: 'mock-proof',
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body) as { error: string };
            expect(body.error).toBe('NoStorageAllowance');
        });

        it('should fail without a valid challenge', async () => {
            const publicKey = getOrThrowTest(PublicKey.from('test-pubkey-add-004'));
            const ownerId = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJgCg'));
            const sessionId = getOrThrowTest(SessionId.from('invalid-add-session'));
            const challenge = getOrThrowTest(Challenge.from('invalid-add-challenge'));

            await registerDevice({
                app: testApp.app,
                storeChallenge: testApp.storeChallenge,
                publicKey,
                size: 100,
            });

            const response = await testApp.app.inject({
                method: 'POST',
                url: '/storage/add',
                payload: {
                    publicKey,
                    ownerId,
                    size: 50,
                    challenge,
                    sessionId,
                    proof: 'mock-proof',
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body) as { error: string };
            expect(body.error).toBe('ChallengeValidationFailed');
        });
    });

    describe('Complex Workflows', () => {
        it('should handle multiple devices assigning to the same owner', async () => {
            const publicKey1 = getOrThrowTest(PublicKey.from('device-multi-001'));
            const publicKey2 = getOrThrowTest(PublicKey.from('device-multi-002'));
            const ownerId = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJgDg'));

            // Register two devices
            await registerDevice({
                app: testApp.app,
                storeChallenge: testApp.storeChallenge,
                publicKey: publicKey1,
                size: 300,
            });

            await registerDevice({
                app: testApp.app,
                storeChallenge: testApp.storeChallenge,
                publicKey: publicKey2,
                size: 200,
            });

            // Both devices assign space to the same owner
            await addSpaceToOwner({
                app: testApp.app,
                storeChallenge: testApp.storeChallenge,
                publicKey: publicKey1,
                ownerId,
                size: 150,
            });

            const result = await addSpaceToOwner({
                app: testApp.app,
                storeChallenge: testApp.storeChallenge,
                publicKey: publicKey2,
                ownerId,
                size: 100,
            });

            // Total owner space should be sum of both assignments
            expect(result.ownerTotalSpace).toBe(250);

            // Verify via ask endpoint
            const askResponse = await testApp.app.inject({
                method: 'POST',
                url: '/storage/ask',
                payload: { ownerId },
            });

            const askBody = JSON.parse(askResponse.body) as {
                totalSpace: number;
                unspentSpace: number;
            };
            expect(askBody.totalSpace).toBe(250);
        });

        it('should handle device registering, assigning, and checking remaining quota', async () => {
            const publicKey = getOrThrowTest(PublicKey.from('device-workflow-001'));
            const owner1 = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJgEg'));
            const owner2 = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJgFg'));

            // Register device with 1000 storage
            await registerDevice({
                app: testApp.app,
                storeChallenge: testApp.storeChallenge,
                publicKey,
                size: 1000,
            });

            // Assign 300 to owner1
            await addSpaceToOwner({
                app: testApp.app,
                storeChallenge: testApp.storeChallenge,
                publicKey,
                ownerId: owner1,
                size: 300,
            });

            // Assign 200 to owner2
            await addSpaceToOwner({
                app: testApp.app,
                storeChallenge: testApp.storeChallenge,
                publicKey,
                ownerId: owner2,
                size: 200,
            });

            // Check device remaining space
            const deviceAskResponse = await testApp.app.inject({
                method: 'POST',
                url: '/storage/ask',
                payload: { publicKey },
            });

            const deviceInfo = JSON.parse(deviceAskResponse.body) as {
                totalSpace: number;
                unspentSpace: number;
            };
            expect(deviceInfo.totalSpace).toBe(1000);
            expect(deviceInfo.unspentSpace).toBe(500); // 1000 - 300 - 200

            // Check owner1 space
            const owner1AskResponse = await testApp.app.inject({
                method: 'POST',
                url: '/storage/ask',
                payload: { ownerId: owner1 },
            });

            const owner1Info = JSON.parse(owner1AskResponse.body) as {
                totalSpace: number;
                unspentSpace: number;
            };
            expect(owner1Info.totalSpace).toBe(300);

            // Check owner2 space
            const owner2AskResponse = await testApp.app.inject({
                method: 'POST',
                url: '/storage/ask',
                payload: { ownerId: owner2 },
            });

            const owner2Info = JSON.parse(owner2AskResponse.body) as {
                totalSpace: number;
                unspentSpace: number;
            };
            expect(owner2Info.totalSpace).toBe(200);
        });
    });
});

