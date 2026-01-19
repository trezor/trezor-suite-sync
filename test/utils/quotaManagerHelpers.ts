import { OwnerId } from '@evolu/common';
import { randomBytes } from 'crypto';
import Fastify from 'fastify';
import { expect } from 'vitest';

import { getOrThrowTest } from '../../src/getOrThrowTest.js';
import { challengeCreateRequestSchema } from '../../src/quotaManager/challenge/endpoints/create/challengeCreateSchema.js';
import { createChallengeCreateHandler } from '../../src/quotaManager/challenge/endpoints/create/createChallengeCreateHandler.js';
import { createChallengeCreateOperation } from '../../src/quotaManager/challenge/endpoints/create/createChallengeCreateOperation.js';
import { evoluValidatorCompiler } from '../../src/quotaManager/evoluValidatorCompiler.js';
import { createStorageAddHandler } from '../../src/quotaManager/storage/endpoints/add/createStorageAddHandler.js';
import { createStorageAddOperation } from '../../src/quotaManager/storage/endpoints/add/createStorageAddOperation.js';
import { storageAddRequestSchema } from '../../src/quotaManager/storage/endpoints/add/storageAddSchema.js';
import { createStorageAskHandler } from '../../src/quotaManager/storage/endpoints/ask/createStorageAskHandler.js';
import { storageAskRequestSchema } from '../../src/quotaManager/storage/endpoints/ask/storageAskSchema.js';
import { createStorageRegisterHandler } from '../../src/quotaManager/storage/endpoints/register/createStorageRegisterHandler.js';
import { createStorageRegisterOperation } from '../../src/quotaManager/storage/endpoints/register/createStorageRegisterOperation.js';
import { storageRegisterRequestSchema } from '../../src/quotaManager/storage/endpoints/register/storageRegisterSchema.js';
import { createSyncPostHandler } from '../../src/quotaManager/sync/endpoints/post/createSyncPostHandler.js';
import { syncPostRequestSchema } from '../../src/quotaManager/sync/endpoints/post/syncPostSchema.js';
import {
    Challenge,
    ChallengeStorage,
    SessionId,
    createChallengeStorage,
} from '../../src/storage/challengeStorage/challengeStorage.js';
import { createTestDatabase } from '../../src/storage/limitStorage/createTestDatabase.js';
import {
    Proof,
    PublicKey,
    Size,
    createLimitStorage,
} from '../../src/storage/limitStorage/limitStorage.js';
import { CA_CERT_OPTIGA, DEVICE_CERT_OPTIGA } from '../mocks/certificates.js';

const createRandomBytes = (size: number) => randomBytes(size).toString('hex');

export type CreateAppParams = {
    maxStoragePerDevice?: number;
};

export const createApp = async (params?: CreateAppParams) => {
    const db = await createTestDatabase();

    const challengeStorage = createChallengeStorage({
        db,
        createTime: () => Date.now(),
    });

    const limitStorage = createLimitStorage({ db });

    const server = Fastify();

    server.setValidatorCompiler(evoluValidatorCompiler);

    // Register challenge endpoint
    const challengeCreateOperation = createChallengeCreateOperation({
        challengeStorage,
        generateRandomBytes: createRandomBytes,
    });
    const challengeCreateHandler = createChallengeCreateHandler({ challengeCreateOperation });
    server.post('/challenge', challengeCreateRequestSchema, challengeCreateHandler);

    // Register storage/register endpoint
    const storageRegisterOperation = createStorageRegisterOperation({
        challengeStorage,
        getLimitsForPubkey: limitStorage.getLimitsForPubkey,
        addLimitToPubkey: limitStorage.addLimitToPubkey,
    });
    const storageRegisterHandler = createStorageRegisterHandler({
        storageRegisterOperation,
    });
    server.post('/storage/register', storageRegisterRequestSchema, storageRegisterHandler);

    // Register storage/add endpoint
    const storageAddOperation = createStorageAddOperation({
        challengeStorage,
        assignSpaceToOwner: limitStorage.assignSpaceToOwner,
    });
    const storageAddHandler = createStorageAddHandler({ storageAddOperation });
    server.post('/storage/add', storageAddRequestSchema, storageAddHandler);

    // Register storage/ask endpoint
    const storageAskHandler = createStorageAskHandler({
        getLimitsForPubkey: limitStorage.getLimitsForPubkey,
        getLimitsForOwner: limitStorage.getLimitsForOwner,
    });
    server.get('/storage/ask', storageAskRequestSchema, storageAskHandler);

    // Register sync endpoint
    const syncPostHandler = createSyncPostHandler();
    server.post('/sync', syncPostRequestSchema, syncPostHandler);

    return {
        server,
        limitStorage,
        challengeStorage,
    };
};

export const getChallenge = async (
    server: ReturnType<typeof Fastify>,
    sessionId: SessionId,
): Promise<Challenge> => {
    const response = await server.inject({
        method: 'POST',
        url: '/challenge',
        payload: { sessionId: sessionId.toString() },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('challenge');

    return getOrThrowTest(Challenge.from(body.challenge));
};

export const registerDevice = async (
    server: ReturnType<typeof Fastify>,
    challengeStorage: ChallengeStorage,
    publicKey: PublicKey,
    size: Size,
): Promise<{ totalStorageSize: number; unspendStorageSize: number }> => {
    const sessionId = getOrThrowTest(
        SessionId.from(`session-register-${publicKey.toString()}-${Date.now()}`),
    );
    const challenge = await getChallenge(server, sessionId);

    const response = await server.inject({
        method: 'POST',
        url: '/storage/register',
        payload: {
            publicKey: publicKey.toString(),
            size,
            challenge: challenge.toString(),
            sessionId: sessionId.toString(),
            proof: getOrThrowTest(Proof.from('valid-proof-hex')).toString(),
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

    return {
        totalStorageSize: body.totalStorageSize,
        unspendStorageSize: body.unspendStorageSize,
    };
};

export const assignSpace = async (
    server: ReturnType<typeof Fastify>,
    publicKey: PublicKey,
    ownerId: OwnerId,
    size: Size,
): Promise<{ storageLimit: number; unspentSpace?: number }> => {
    const sessionId = getOrThrowTest(
        SessionId.from(`session-add-${publicKey.toString()}-${Date.now()}`),
    );
    const challenge = await getChallenge(server, sessionId);

    const response = await server.inject({
        method: 'POST',
        url: '/storage/add',
        payload: {
            publicKey: publicKey.toString(),
            ownerId: ownerId.toString(),
            size,
            challenge: challenge.toString(),
            sessionId: sessionId.toString(),
            proof: getOrThrowTest(Proof.from('valid-proof-hex')).toString(),
        },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    // The add endpoint returns: { publicKeyUnspentSpace, ownerTotalSpace }
    expect(body).toHaveProperty('publicKeyUnspentSpace');
    expect(body).toHaveProperty('ownerTotalSpace');

    return {
        storageLimit: body.ownerTotalSpace,
        unspentSpace: body.publicKeyUnspentSpace,
    };
};

export const deleteOwner = async (
    server: ReturnType<typeof Fastify>,
    ownerId: OwnerId,
    options?: { publicKey?: PublicKey; recipientOwnerId?: OwnerId },
): Promise<any> => {
    const payload: any = {
        ownerId: ownerId.toString(),
    };

    if (options?.publicKey) {
        payload.publicKey = options.publicKey.toString();
    }
    if (options?.recipientOwnerId) {
        payload.recipientOwnerId = options.recipientOwnerId.toString();
    }

    const response = await server.inject({
        method: 'POST',
        url: '/storage/delete',
        payload,
    });

    expect(response.statusCode).toBe(200);

    return JSON.parse(response.body);
};

export const askSpace = async (
    server: ReturnType<typeof Fastify>,
    options: { ownerId?: OwnerId; publicKey?: PublicKey },
): Promise<any> => {
    const query = options.ownerId
        ? `ownerId=${encodeURIComponent(options.ownerId.toString())}`
        : `publicKey=${encodeURIComponent(options.publicKey!.toString())}`;

    const response = await server.inject({
        method: 'GET',
        url: `/storage/ask?${query}`,
    });

    expect(response.statusCode).toBe(200);

    return JSON.parse(response.body);
};
