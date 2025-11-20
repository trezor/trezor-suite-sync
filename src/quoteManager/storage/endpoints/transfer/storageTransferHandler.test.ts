import { OwnerId } from '@evolu/common';
import Fastify from 'fastify';
import { assert, beforeEach, describe, expect, it, vi } from 'vitest';

import { CA_CERT_OPTIGA, DEVICE_CERT_OPTIGA } from '../../../../../test/mocks/certificates.js';
import { getOrThrowTest } from '../../../../getOrThrowTest.js';
import {
    Challenge,
    ChallengeStorage,
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
import { registerStorageEndpoints } from '../../registerStorageEndpoints.js';

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
const size50 = getOrThrowTest(Size.from(50));
const size100 = getOrThrowTest(Size.from(100));
const size200 = getOrThrowTest(Size.from(200));

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

    return {
        server,
        limitStorage: limitStorageResult.value,
        challengeStorage: challengeStorageResult.value,
    };
};

const registerDevice = async (
    server: ReturnType<typeof Fastify>,
    challengeStorage: ChallengeStorage,
    publicKey: PublicKey,
    size: Size,
) => {
    const sessionId = getOrThrowTest(SessionId.from(`session-register-${publicKey.toString()}`));
    const challenge = getOrThrowTest(Challenge.from(`challenge-${publicKey.toString()}`));
    const storeResult = challengeStorage.storeChallenge(sessionId, challenge);
    assert(storeResult.ok);

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
};

describe('POST /storage/add', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('successfully transfers space from device to owner', async () => {
        const { server, challengeStorage } = await createApp();

        await registerDevice(server, challengeStorage, publicKey1, size200);

        const sessionId = getOrThrowTest(SessionId.from('session-add-1'));
        const challenge = getOrThrowTest(Challenge.from('challenge-add-1'));
        const storeResult = challengeStorage.storeChallenge(sessionId, challenge);
        assert(storeResult.ok);

        const response = await server.inject({
            method: 'POST',
            url: '/storage/add',
            payload: {
                publicKey: publicKey1.toString(),
                ownerId: ownerId1.toString(),
                size: size50,
                proof: getOrThrowTest(Proof.from('proof-add-1')).toString(),
                timestamp: Date.now(),
            },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('storageLimit');
    });

    it('allows multiple transfers from same device to different owners', async () => {
        const { server, challengeStorage } = await createApp();

        await registerDevice(server, challengeStorage, publicKey1, size200);

        const sessionId1 = getOrThrowTest(SessionId.from('session-add-2'));
        const challenge1 = getOrThrowTest(Challenge.from('challenge-add-2'));
        challengeStorage.storeChallenge(sessionId1, challenge1);

        const response1 = await server.inject({
            method: 'POST',
            url: '/storage/add',
            payload: {
                publicKey: publicKey1.toString(),
                ownerId: ownerId1.toString(),
                size: size50,
                proof: getOrThrowTest(Proof.from('proof-add-2')).toString(),
                timestamp: Date.now(),
            },
        });

        expect(response1.statusCode).toBe(200);

        const sessionId2 = getOrThrowTest(SessionId.from('session-add-3'));
        const challenge2 = getOrThrowTest(Challenge.from('challenge-add-3'));
        challengeStorage.storeChallenge(sessionId2, challenge2);

        const response2 = await server.inject({
            method: 'POST',
            url: '/storage/add',
            payload: {
                publicKey: publicKey1.toString(),
                ownerId: ownerId2.toString(),
                size: size50,
                proof: getOrThrowTest(Proof.from('proof-add-3')).toString(),
                timestamp: Date.now(),
            },
        });

        expect(response2.statusCode).toBe(200);
    });

    // Todo: test burning space by transferring to ownerId "0" when that feature is implemented

    it('returns 400 when device has insufficient unspent space', async () => {
        const { server, challengeStorage } = await createApp();

        await registerDevice(server, challengeStorage, publicKey1, size50);

        const sessionId = getOrThrowTest(SessionId.from('session-insufficient'));
        const challenge = getOrThrowTest(Challenge.from('challenge-insufficient'));
        challengeStorage.storeChallenge(sessionId, challenge);

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

    it('returns 400 when publicKey is unknown', async () => {
        const { server, challengeStorage } = await createApp();

        const sessionId = getOrThrowTest(SessionId.from('session-unknown'));
        const challenge = getOrThrowTest(Challenge.from('challenge-unknown'));
        challengeStorage.storeChallenge(sessionId, challenge);

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

    it('returns 400 when schema validation fails', async () => {
        const { server } = await createApp();

        const response = await server.inject({
            method: 'POST',
            url: '/storage/add',
            payload: {
                publicKey: publicKey1.toString(),
            },
        });

        expect(response.statusCode).toBe(400);
    });
});
