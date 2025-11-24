import { OwnerId } from '@evolu/common';
import { randomBytes } from 'crypto';
import Fastify from 'fastify';
import { assert, expect } from 'vitest';

import { getOrThrowTest } from '../../src/getOrThrowTest.js';
import { registerChallengeEndpoints } from '../../src/quoteManager/challenge/registerChallengeEndpoints.js';
import { evoluValidatorCompiler } from '../../src/quoteManager/evoluValidatorCompiler.js';
import { registerStorageEndpoints } from '../../src/quoteManager/storage/registerStorageEndpoints.js';
import { registerSyncEndpoints } from '../../src/quoteManager/sync/registerSyncEndpoints.js';
import {
    Challenge,
    ChallengeStorage,
    SessionId,
    createChallengeStorage,
} from '../../src/storage/challengeStorage/challengeStorage.js';
import {
    Proof,
    PublicKey,
    Size,
    createLimitStorage,
} from '../../src/storage/limitStorage/limitStorage.js';
import { prepareSqlite } from '../../src/storage/prepareSqlite.js';
import { CA_CERT_OPTIGA, DEVICE_CERT_OPTIGA } from '../mocks/certificates.js';

const createRandomBytes = (size: number) => randomBytes(size).toString('hex');

export type CreateAppParams = {
    maxStoragePerDevice?: number;
};

export const createApp = async (params?: CreateAppParams) => {
    const sqlite = await prepareSqlite({ inMemory: true });
    assert(sqlite.ok);

    const challengeStorageResult = createChallengeStorage({ sqlite: sqlite.value });
    assert(challengeStorageResult.ok);

    const limitStorageResult = createLimitStorage({ sqlite: sqlite.value });
    assert(limitStorageResult.ok);

    const server = Fastify();

    server.setValidatorCompiler(evoluValidatorCompiler);

    registerStorageEndpoints({
        server,
        limitStorage: limitStorageResult.value,
        challengeStorage: challengeStorageResult.value,
        ...(params?.maxStoragePerDevice !== undefined && {
            maxStoragePerDevice: params.maxStoragePerDevice,
        }),
    });
    registerSyncEndpoints({ server });
    registerChallengeEndpoints({
        server,
        challengeStorage: challengeStorageResult.value,
        createRandomBytes,
    });

    return {
        server,
        limitStorage: limitStorageResult.value,
        challengeStorage: challengeStorageResult.value,
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
    const sessionId = getOrThrowTest(SessionId.from(`session-register-${publicKey.toString()}-${Date.now()}`));
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
    const response = await server.inject({
        method: 'POST',
        url: '/storage/add',
        payload: {
            publicKey: publicKey.toString(),
            ownerId: ownerId.toString(),
            size,
            proof: getOrThrowTest(Proof.from('valid-proof-hex')).toString(),
            timestamp: Date.now(),
        },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    
    if (body.unspentSpace !== undefined) {
        expect(body).toHaveProperty('unspentSpace');

        return { storageLimit: 0, unspentSpace: body.unspentSpace };
    }
    
    expect(body).toHaveProperty('storageLimit');

    return { storageLimit: body.storageLimit };
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

