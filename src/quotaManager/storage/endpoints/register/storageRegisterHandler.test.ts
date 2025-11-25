import Fastify from 'fastify';
import { assert, describe, expect, it, vi } from 'vitest';

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

const { T2B1rootPubKeyOptiga } = vi.hoisted(() => ({
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
const publicKey = getOrThrowTest(PublicKey.from('test-pubkey-123'));
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
    it('successfully registers storage and returns 200 with correct response format', async () => {
        const { app, challengeStorage } = await createApp();

        const sessionId = getOrThrowTest(SessionId.from('session-123'));
        const challenge = getOrThrowTest(Challenge.from('challenge-abc-123'));
        const storeResult = challengeStorage.storeChallenge(sessionId, challenge);
        assert(storeResult.ok);

        const response = await app.inject({
            method: 'POST',
            url: '/storage/register',
            payload: {
                publicKey: publicKey.toString(),
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

    it('returns 400 when schema validation fails', async () => {
        const { app } = await createApp();

        const response = await app.inject({
            method: 'POST',
            url: '/storage/register',
            payload: {
                publicKey: publicKey.toString(),
            },
        });

        expect(response.statusCode).toBe(400);
    });
});
