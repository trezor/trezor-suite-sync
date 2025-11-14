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

vi.mock('@trezor/device-authenticity', async () => {
    const actual = await vi.importActual<typeof import('@trezor/device-authenticity')>(
        '@trezor/device-authenticity',
    );

    return {
        ...actual,
        verifyAuthenticityProof: vi.fn().mockResolvedValue({
            valid: true,
            caPubKey: 'test-ca-pubkey',
            rootPubKey: 'test-root-pubkey',
        }),
        parseCertificate: vi.fn().mockReturnValue({
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
        }),
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
