import { assert, describe, expect, it, vi } from 'vitest';

import { createStorageRegisterHandler } from './createStorageRegisterHandler.js';
import { createStorageRegisterOperation } from './createStorageRegisterOperation.js';
import { storageRegisterRequestSchema } from './storageRegisterSchema.js';
import { CA_CERT_OPTIGA, DEVICE_CERT_OPTIGA } from '../../../../../test/mocks/certificates.js';
import { getOrThrowTest } from '../../../../getOrThrowTest.js';
import { Challenge, SessionId } from '../../../../storage/challengeStorage/challengeStorage.js';
import { Proof, PublicKey, Size } from '../../../../storage/limitStorage/limitStorage.js';
import { evoluValidatorCompiler } from '../../../evoluValidatorCompiler.js';
import { createTestFastifyApp } from '../../../tests/createTestFastifyApp.js';

const { T2B1rootPubKeyOptiga } = vi.hoisted(() => ({
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
const publicKey = getOrThrowTest(PublicKey.from('test-pubkey-123'));
const size100 = getOrThrowTest(Size.from(100));

type CreateAppParams = {
    maxStoragePerDevice?: number;
};

const createApp = async (params?: CreateAppParams) => {
    const services = await createTestFastifyApp();

    services.app.setValidatorCompiler(evoluValidatorCompiler);

    const storageRegisterOperation = createStorageRegisterOperation({
        challengeStorage: services.challengeStorage,
        getLimitsForPubkey: services.limitStorage.getLimitsForPubkey,
        addLimitToPubkey: services.limitStorage.addLimitToPubkey,
    });
    const storageRegisterHandler = createStorageRegisterHandler({
        storageRegisterOperation,
    });
    services.app.post('/storage/register', storageRegisterRequestSchema, storageRegisterHandler);

    return services;
};

describe(createStorageRegisterHandler.name, () => {
    it('successfully registers storage and returns 200 with correct response format', async () => {
        const { app, challengeStorage } = await createApp();

        const sessionId = getOrThrowTest(SessionId.from('session-123'));
        const challenge = getOrThrowTest(Challenge.from('challenge-abc-123'));
        const storeResult = await challengeStorage.storeChallenge(sessionId, challenge);
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
