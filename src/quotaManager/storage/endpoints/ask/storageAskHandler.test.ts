import { OwnerId } from '@evolu/common';
import { verifySignatureP256 } from '@trezor/device-authenticity';
import Fastify from 'fastify';
import { assert, beforeEach, describe, expect, it, vi } from 'vitest';

import { createStorageAskHandler } from './createStorageAskHandler.js';
import { storageAskRequestSchema } from './storageAskSchema.js';
import { CA_CERT_OPTIGA, DEVICE_CERT_OPTIGA } from '../../../../../test/mocks/certificates.js';
import { getOrThrowTest } from '../../../../getOrThrowTest.js';
import type { ChallengeStorage } from '../../../../storage/challengeStorage/challengeStorage.js';
import {
    Challenge,
    SessionId,
    createChallengeStorage,
} from '../../../../storage/challengeStorage/challengeStorage.js';
import { createTestDatabase } from '../../../../storage/limitStorage/createTestDatabase.js';
import {
    Proof,
    PublicKey,
    Size,
    createLimitStorage,
} from '../../../../storage/limitStorage/limitStorage.js';
import { evoluValidatorCompiler } from '../../../evoluValidatorCompiler.js';
import { createStorageAddHandler } from '../add/createStorageAddHandler.js';
import { createStorageAddOperation } from '../add/createStorageAddOperation.js';
import { storageAddRequestSchema } from '../add/storageAddSchema.js';
import { createStorageRegisterHandler } from '../register/createStorageRegisterHandler.js';
import { createStorageRegisterOperation } from '../register/createStorageRegisterOperation.js';
import { storageRegisterRequestSchema } from '../register/storageRegisterSchema.js';

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
        verifySignatureP256: vi.fn(),
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

const publicKey1 = getOrThrowTest(
    PublicKey.from('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'),
);
const ownerId1 = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJg6g'));
const size100 = getOrThrowTest(Size.from(100));
const size50 = getOrThrowTest(Size.from(50));

type CreateAppParams = {
    maxStoragePerDevice?: number;
};

const createApp = async (params?: CreateAppParams) => {
    const db = await createTestDatabase();

    const challengeStorage = createChallengeStorage({
        db,
        createTime: () => Date.now(),
    });

    const limitStorage = createLimitStorage({ db });

    const server = Fastify();

    server.setValidatorCompiler(evoluValidatorCompiler);

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

    return {
        server,
        limitStorage,
        challengeStorage,
    };
};

const registerDevice = async (
    server: ReturnType<typeof Fastify>,
    challengeStorage: ChallengeStorage,
    publicKey: PublicKey,
    size: Size,
) => {
    const sessionId: SessionId = getOrThrowTest(
        SessionId.from(`session-register-${publicKey.toString()}`),
    );
    const challenge: Challenge = getOrThrowTest(
        Challenge.from(`challenge-${publicKey.toString()}`),
    );
    const storeResult = await challengeStorage.storeChallenge(sessionId, challenge);
    assert(storeResult.ok);

    const response = await server.inject({
        method: 'POST',
        url: '/storage/register',
        payload: {
            publicKey: publicKey.toString(),
            size: Number(size),
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

describe(createStorageAskHandler.name, () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(verifySignatureP256).mockResolvedValue(true);
    });

    it('returns space information for ownerId', async () => {
        const { server, challengeStorage } = await createApp();

        await registerDevice(server, challengeStorage, publicKey1, size100);

        const sessionId: SessionId = getOrThrowTest(SessionId.from('session-add-1'));
        const challenge: Challenge = getOrThrowTest(Challenge.from('challenge-add-1'));
        const storeResult = await challengeStorage.storeChallenge(sessionId, challenge);
        assert(storeResult.ok);

        const addResponse = await server.inject({
            method: 'POST',
            url: '/storage/add',
            payload: {
                publicKey: publicKey1.toString(),
                ownerId: ownerId1.toString(),
                size: Number(size50),
                challenge: challenge.toString(),
                sessionId: sessionId.toString(),
                proof: getOrThrowTest(Proof.from('proof-add-1')).toString(),
            },
        });

        expect(addResponse.statusCode).toBe(200);

        const askResponse = await server.inject({
            method: 'GET',
            url: `/storage/ask?ownerId=${encodeURIComponent(ownerId1.toString())}`,
        });

        expect(askResponse.statusCode).toBe(200);
        const body = JSON.parse(askResponse.body);
        expect(body).toHaveProperty('totalSpace');
        expect(body.totalSpace).toBe(50);
    });

    it('returns space information for publicKey', async () => {
        const { server, challengeStorage } = await createApp();

        await registerDevice(server, challengeStorage, publicKey1, size100);

        const askResponse = await server.inject({
            method: 'GET',
            url: `/storage/ask?publicKey=${encodeURIComponent(publicKey1.toString())}`,
        });

        expect(askResponse.statusCode).toBe(200);
        const body = JSON.parse(askResponse.body);
        expect(body).toHaveProperty('totalSpace');
        expect(body).toHaveProperty('unspentSpace');
        expect(body.totalSpace).toBe(100);
        expect(body.unspentSpace).toBe(100);
    });

    it('returns updated unspent space after transfer', async () => {
        const { server, challengeStorage } = await createApp();

        await registerDevice(server, challengeStorage, publicKey1, size100);

        const sessionId: SessionId = getOrThrowTest(SessionId.from('session-add-2'));
        const challenge: Challenge = getOrThrowTest(Challenge.from('challenge-add-2'));
        const storeResult = await challengeStorage.storeChallenge(sessionId, challenge);
        assert(storeResult.ok);

        const addResponse = await server.inject({
            method: 'POST',
            url: '/storage/add',
            payload: {
                publicKey: publicKey1.toString(),
                ownerId: ownerId1.toString(),
                size: Number(size50),
                challenge: challenge.toString(),
                sessionId: sessionId.toString(),
                proof: getOrThrowTest(Proof.from('proof-add-2')).toString(),
            },
        });

        expect(addResponse.statusCode).toBe(200);

        const askResponse = await server.inject({
            method: 'GET',
            url: `/storage/ask?publicKey=${encodeURIComponent(publicKey1.toString())}`,
        });

        expect(askResponse.statusCode).toBe(200);
        const body = JSON.parse(askResponse.body);
        expect(body.totalSpace).toBe(100);
        expect(body.unspentSpace).toBe(50);
    });

    it('returns 404 when ownerId is not found', async () => {
        const { server } = await createApp();

        const unknownOwnerId = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJg8g'));

        const askResponse = await server.inject({
            method: 'GET',
            url: `/storage/ask?ownerId=${encodeURIComponent(unknownOwnerId.toString())}`,
        });

        expect(askResponse.statusCode).toBe(404);
        const body = JSON.parse(askResponse.body);
        expect(body.error).toBe('OwnerNotFound');
    });

    it('returns 404 when publicKey is not found', async () => {
        const { server } = await createApp();

        const unknownPublicKey = getOrThrowTest(
            PublicKey.from('unknown-pubkey-123456789012345678901234567890123456789012345678'),
        );

        const askResponse = await server.inject({
            method: 'GET',
            url: `/storage/ask?publicKey=${encodeURIComponent(unknownPublicKey.toString())}`,
        });

        expect(askResponse.statusCode).toBe(404);
        const body = JSON.parse(askResponse.body);
        expect(body.error).toBe('Public key not found');
    });

    it('returns 400 when neither ownerId nor publicKey is provided', async () => {
        const { server } = await createApp();

        const askResponse = await server.inject({
            method: 'GET',
            url: '/storage/ask',
        });

        expect(askResponse.statusCode).toBe(400);
        const body = JSON.parse(askResponse.body);
        expect(body.error).toBe('Either ownerId or publicKey is required');
    });
});
