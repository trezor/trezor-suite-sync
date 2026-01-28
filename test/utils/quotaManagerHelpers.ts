import { FastifyInstance } from 'fastify';
// eslint-disable-next-line import/no-extraneous-dependencies
import { assert } from 'vitest';

import { getOrThrowTest } from '../../src/getOrThrowTest.js';
import { challengeCreateRequestSchema } from '../../src/quotaManager/challenge/endpoints/create/challengeCreateSchema.js';
import { createChallengeCreateHandler } from '../../src/quotaManager/challenge/endpoints/create/createChallengeCreateHandler.js';
import { createChallengeCreateOperation } from '../../src/quotaManager/challenge/endpoints/create/createChallengeCreateOperation.js';
import { createFastifyServer } from '../../src/quotaManager/createFastifyServer.js';
import { createStorageAddHandler } from '../../src/quotaManager/storage/endpoints/add/createStorageAddHandler.js';
import { createStorageAddOperation } from '../../src/quotaManager/storage/endpoints/add/createStorageAddOperation.js';
import { storageAddRequestSchema } from '../../src/quotaManager/storage/endpoints/add/storageAddSchema.js';
import { createStorageAskHandler } from '../../src/quotaManager/storage/endpoints/ask/createStorageAskHandler.js';
import { storageAskRequestSchema } from '../../src/quotaManager/storage/endpoints/ask/storageAskSchema.js';
import { createStorageRegisterHandler } from '../../src/quotaManager/storage/endpoints/register/createStorageRegisterHandler.js';
import { createStorageRegisterOperation } from '../../src/quotaManager/storage/endpoints/register/createStorageRegisterOperation.js';
import { storageRegisterRequestSchema } from '../../src/quotaManager/storage/endpoints/register/storageRegisterSchema.js';
import {
    Challenge,
    SessionId,
} from '../../src/storage/challengeStorage/createChallengeStorage.js';
import { createDeleteChallenge } from '../../src/storage/challengeStorage/methods/createDeleteChallenge.js';
import { createStoreChallenge } from '../../src/storage/challengeStorage/methods/createStoreChallenge.js';
import { createValidateAndConsumeChallenge } from '../../src/storage/challengeStorage/methods/createValidateAndConsumeChallenge.js';
import { PublicKey } from '../../src/storage/limitStorage/limitStorage.js';
import { createAddLimitToPubkey } from '../../src/storage/limitStorage/methods/createAddLimitToPubkey.js';
import { createAssignSpaceToOwner } from '../../src/storage/limitStorage/methods/createAssignSpaceToOwner.js';
import { createGetLimitsForOwner } from '../../src/storage/limitStorage/methods/createGetLimitsForOwner.js';
import { createGetLimitsForPubkey } from '../../src/storage/limitStorage/methods/createGetLimitsForPubkey.js';
import { createTestDatabase } from '../../src/storage/posgres/createTestDatabase.js';
import { CA_CERT_OPTIGA, DEVICE_CERT_OPTIGA } from '../mocks/certificates.js';

export type TestAppDeps = {
    app: FastifyInstance;
    db: Awaited<ReturnType<typeof createTestDatabase>>;
    storeChallenge: ReturnType<typeof createStoreChallenge>;
};

/**
 * Creates a test application with all quota manager endpoints wired up.
 * This follows the composition root pattern used in the actual application.
 */
export const createTestApp = async (): Promise<TestAppDeps> => {
    const createTime = () => Date.now();
    const generateRandomBytes = (size: number) =>
        Array.from({ length: size }, () =>
            Math.floor(Math.random() * 16).toString(16),
        ).join('');

    const db = await createTestDatabase();

    // Challenge storage dependencies
    const deleteChallenge = createDeleteChallenge({ db });
    const storeChallenge = createStoreChallenge({ db, createTime });
    const validateAndConsumeChallenge = createValidateAndConsumeChallenge({
        db,
        createTime,
        deleteChallenge,
    });

    // Limit storage dependencies
    const getLimitsForPubkey = createGetLimitsForPubkey({ db });
    const getLimitsForOwner = createGetLimitsForOwner({ db });
    const addLimitToPubkey = createAddLimitToPubkey({ db, getLimitsForPubkey });
    const assignSpaceToOwner = createAssignSpaceToOwner({
        db,
        getLimitsForPubkey,
        getLimitsForOwner,
    });

    // Operations
    const challengeCreateOperation = createChallengeCreateOperation({
        storeChallenge,
        cleanupExpiredChallenges: () => Promise.resolve({ ok: true, value: undefined }),
        generateRandomBytes,
    });

    const storageRegisterOperation = createStorageRegisterOperation({
        validateAndConsumeChallenge,
        getLimitsForPubkey,
        addLimitToPubkey,
    });

    const storageAddOperation = createStorageAddOperation({
        validateAndConsumeChallenge,
        assignSpaceToOwner,
    });

    // Create Fastify app and wire up handlers
    const app = createFastifyServer({ updateHealth: () => {} });

    const challengeCreateHandler = createChallengeCreateHandler({ challengeCreateOperation });
    app.post('/challenge', challengeCreateRequestSchema, challengeCreateHandler);

    const storageRegisterHandler = createStorageRegisterHandler({ storageRegisterOperation });
    app.post('/storage/register', storageRegisterRequestSchema, storageRegisterHandler);

    const storageAddHandler = createStorageAddHandler({ storageAddOperation });
    app.post('/storage/add', storageAddRequestSchema, storageAddHandler);

    const storageAskHandler = createStorageAskHandler({
        getLimitsForPubkey,
        getLimitsForOwner,
    });
    app.post('/storage/ask', storageAskRequestSchema, storageAskHandler);

    return { app, db, storeChallenge };
};

export type ChallengeCreateResponse = {
    sessionId: string;
    challenge: string;
};

/**
 * Helper to create a challenge via the API endpoint.
 */
export const createChallenge = async (
    app: FastifyInstance,
): Promise<ChallengeCreateResponse> => {
    // Generate a sessionId for the challenge request
    const sessionId = getOrThrowTest(SessionId.from(`session-${Date.now()}`));

    const response = await app.inject({
        method: 'POST',
        url: '/challenge',
        payload: { sessionId },
    });

    assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);

    const body = JSON.parse(response.body) as { challenge: string };
    assert(body.challenge, 'challenge is required');

    return {
        sessionId,
        challenge: body.challenge,
    };
};

export type RegisterDeviceParams = {
    app: FastifyInstance;
    storeChallenge: ReturnType<typeof createStoreChallenge>;
    publicKey: PublicKey;
    size: number;
    deviceModel?: string;
    proof?: string;
};

/**
 * Helper to register a device with storage quota.
 * Stores the challenge first, then calls the register endpoint.
 */
export const registerDevice = async ({
    app,
    storeChallenge,
    publicKey,
    size,
    deviceModel = 'T2B1',
    proof = 'mock-proof-signature',
}: RegisterDeviceParams): Promise<{ totalStorageSize: number; unspentStorageSize: number }> => {
    const sessionId: SessionId = getOrThrowTest(
        SessionId.from(`session-register-${publicKey}`),
    );
    const challenge: Challenge = getOrThrowTest(Challenge.from(`challenge-${publicKey}`));

    const storeResult = await storeChallenge({ sessionId, challenge });
    assert(storeResult.ok, 'Failed to store challenge');

    const response = await app.inject({
        method: 'POST',
        url: '/storage/register',
        payload: {
            publicKey,
            size,
            challenge,
            sessionId,
            proof,
            certificateChain: {
                deviceCert: DEVICE_CERT_OPTIGA,
                caCert: CA_CERT_OPTIGA,
            },
            deviceModel,
        },
    });

    assert(
        response.statusCode === 200,
        `Register failed with ${response.statusCode}: ${response.body}`,
    );

    return JSON.parse(response.body) as { totalStorageSize: number; unspentStorageSize: number };
};

export type AddSpaceToOwnerParams = {
    app: FastifyInstance;
    storeChallenge: ReturnType<typeof createStoreChallenge>;
    publicKey: PublicKey;
    ownerId: string;
    size: number;
    proof?: string;
};

/**
 * Helper to add space to an owner (assign device storage to owner).
 */
export const addSpaceToOwner = async ({
    app,
    storeChallenge,
    publicKey,
    ownerId,
    size,
    proof = 'mock-proof-signature',
}: AddSpaceToOwnerParams): Promise<{ publicKeyUnspentSpace: number; ownerTotalSpace: number | null }> => {
    const sessionId: SessionId = getOrThrowTest(SessionId.from(`session-add-${publicKey}-${ownerId}`));
    const challenge: Challenge = getOrThrowTest(Challenge.from(`challenge-add-${publicKey}-${ownerId}`));

    const storeResult = await storeChallenge({ sessionId, challenge });
    assert(storeResult.ok, 'Failed to store challenge');

    const response = await app.inject({
        method: 'POST',
        url: '/storage/add',
        payload: {
            publicKey,
            ownerId,
            size,
            challenge,
            sessionId,
            proof,
        },
    });

    assert(
        response.statusCode === 200,
        `Add space failed with ${response.statusCode}: ${response.body}`,
    );

    return JSON.parse(response.body) as {
        publicKeyUnspentSpace: number;
        ownerTotalSpace: number | null;
    };
};

