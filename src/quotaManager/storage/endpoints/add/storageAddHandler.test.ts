import { OwnerId } from '@evolu/common';
import Fastify from 'fastify';
import { assert, beforeEach, describe, expect, it, vi } from 'vitest';

import { storageAddEndpoint } from './storageAddEndpoint.js';
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
import { addLimitToPubkey } from '../../../../storage/limitStorage/methods/addLimitToPubkey.js';
import { prepareSqlite } from '../../../../storage/prepareSqlite.js';
import { evoluValidatorCompiler } from '../../../evoluValidatorCompiler.js';
import { verifyAuthenticityProof } from '../../utils/deviceAuthenticationWrapper.js';

const { T2B1rootPubKeyOptiga } = vi.hoisted(() => ({
    T2B1rootPubKeyOptiga:
        '04626d58aca84f0fcb52ea63f0eb08de1067b8d406574a715d5e7928f4b67f113a00fb5c5918e74d2327311946c446b242c20fe7347482999bdc1e229b94e27d96',
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

const publicKey = getOrThrowTest(
    PublicKey.from(
        '049bbf06dad9ab5905e05471ce16d5222c89c2caa39f26267ac0747129885fbd441bcc7fa84de120a36755daf30a6f47e8c0d4bddc15036ed2a3447dfa7a1d3e88',
    ),
);
const ownerId = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJg6g'));
const burnOwnerId = '0' as OwnerId;
const size50 = getOrThrowTest(Size.from(50));
const size20 = getOrThrowTest(Size.from(20));
const certificateChain = {
    deviceCert: DEVICE_CERT_OPTIGA,
    caCert: CA_CERT_OPTIGA,
};
const deviceModel = 'T2B1';

const createApp = async () => {
    const sqlite = await prepareSqlite({ inMemory: true });
    assert(sqlite.ok);

    const challengeStorageResult = createChallengeStorage({ sqlite: sqlite.value });
    assert(challengeStorageResult.ok);

    const limitStorageResult = createLimitStorage({ sqlite: sqlite.value });
    assert(limitStorageResult.ok);

    addLimitToPubkey({ sqlite: sqlite.value, publicKey, size: size50 });

    const app = Fastify();

    app.setValidatorCompiler(evoluValidatorCompiler);

    app.post(
        '/storage/add',
        storageAddEndpoint.schema,
        storageAddEndpoint.createHandler({
            limitStorage: limitStorageResult.value,
            challengeStorage: challengeStorageResult.value,
        }),
    );

    return {
        app,
        challengeStorage: challengeStorageResult.value,
    };
};

describe(storageAddEndpoint.createHandler.name, () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(verifyAuthenticityProof).mockResolvedValue({
            valid: true,
            caPubKey: 'test-ca-pubkey',
            rootPubKey: T2B1rootPubKeyOptiga,
        });
    });

    it('successfully assigns space and returns 200 with correct response format', async () => {
        const { app, challengeStorage } = await createApp();

        const sessionId = getOrThrowTest(SessionId.from('session-123'));
        const challenge = getOrThrowTest(
            Challenge.from('29d0be0f3cb191c80d108359c64d22984a77ad8b99433814be31db0b6e9e7920'),
        );
        const storeResult = challengeStorage.storeChallenge(sessionId, challenge);
        assert(storeResult.ok);

        const response = await app.inject({
            method: 'POST',
            url: '/storage/add',
            payload: {
                publicKey: publicKey.toString(),
                ownerId: ownerId.toString(),
                size: size20,
                challenge: challenge.toString(),
                sessionId: sessionId.toString(),
                proof: getOrThrowTest(Proof.from('deadbeef')).toString(),
                certificateChain,
                deviceModel,
            },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body).toHaveProperty('publicKeyUnspentSpace');
        expect(body).toHaveProperty('ownerTotalSpace');
        expect(body.publicKeyUnspentSpace).toBe(30);
        expect(body.ownerTotalSpace).toBe(20);
    });

    it('allows burning space when ownerId is zero', async () => {
        const { app, challengeStorage } = await createApp();

        const sessionId = getOrThrowTest(SessionId.from('session-456'));
        const challenge = getOrThrowTest(
            Challenge.from('39d0be0f3cb191c80d108359c64d22984a77ad8b99433814be31db0b6e9e7931'),
        );
        const storeResult = challengeStorage.storeChallenge(sessionId, challenge);
        assert(storeResult.ok);

        const response = await app.inject({
            method: 'POST',
            url: '/storage/add',
            payload: {
                publicKey: publicKey.toString(),
                ownerId: burnOwnerId,
                size: size20,
                challenge: challenge.toString(),
                sessionId: sessionId.toString(),
                proof: getOrThrowTest(Proof.from('deadbeef')).toString(),
                certificateChain,
                deviceModel,
            },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.publicKeyUnspentSpace).toBe(30);
        expect(body.ownerTotalSpace).toBeNull();
    });

    it('returns 400 when schema validation fails', async () => {
        const { app } = await createApp();

        const response = await app.inject({
            method: 'POST',
            url: '/storage/add',
            payload: {
                publicKey: publicKey.toString(),
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it('returns 400 when challenge validation fails', async () => {
        const { app } = await createApp();

        const sessionId = getOrThrowTest(SessionId.from('session-789'));
        const challenge = getOrThrowTest(
            Challenge.from('49d0be0f3cb191c80d108359c64d22984a77ad8b99433814be31db0b6e9e7942'),
        );

        const response = await app.inject({
            method: 'POST',
            url: '/storage/add',
            payload: {
                publicKey: publicKey.toString(),
                ownerId: ownerId.toString(),
                size: size20,
                challenge: challenge.toString(),
                sessionId: sessionId.toString(),
                proof: getOrThrowTest(Proof.from('deadbeef')).toString(),
                certificateChain,
                deviceModel,
            },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error).toBe('ChallengeValidationFailed');
    });

    it('returns 400 when proof verification fails', async () => {
        vi.mocked(verifyAuthenticityProof).mockResolvedValue({
            valid: false,
            error: 'INVALID_DEVICE_SIGNATURE',
        });

        const { app, challengeStorage } = await createApp();

        const sessionId = getOrThrowTest(SessionId.from('session-proof-fail'));
        const challenge = getOrThrowTest(
            Challenge.from('59d0be0f3cb191c80d108359c64d22984a77ad8b99433814be31db0b6e9e7953'),
        );
        const storeResult = challengeStorage.storeChallenge(sessionId, challenge);
        assert(storeResult.ok);

        const response = await app.inject({
            method: 'POST',
            url: '/storage/add',
            payload: {
                publicKey: publicKey.toString(),
                ownerId: ownerId.toString(),
                size: size20,
                challenge: challenge.toString(),
                sessionId: sessionId.toString(),
                proof: getOrThrowTest(Proof.from('deadbeef')).toString(),
                certificateChain,
                deviceModel,
            },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error).toBe('ProofValidationFailed');
    });

    it('returns 400 when there is insufficient unspent space', async () => {
        const { app, challengeStorage } = await createApp();

        const sessionId1 = getOrThrowTest(SessionId.from('session-1'));
        const challenge1 = getOrThrowTest(
            Challenge.from('69d0be0f3cb191c80d108359c64d22984a77ad8b99433814be31db0b6e9e7964'),
        );
        const storeResult1 = challengeStorage.storeChallenge(sessionId1, challenge1);
        assert(storeResult1.ok);

        const firstResponse = await app.inject({
            method: 'POST',
            url: '/storage/add',
            payload: {
                publicKey: publicKey.toString(),
                ownerId: ownerId.toString(),
                size: size50,
                challenge: challenge1.toString(),
                sessionId: sessionId1.toString(),
                proof: getOrThrowTest(Proof.from('deadbeef')).toString(),
                certificateChain,
                deviceModel,
            },
        });

        expect(firstResponse.statusCode).toBe(200);

        const sessionId2 = getOrThrowTest(SessionId.from('session-2'));
        const challenge2 = getOrThrowTest(
            Challenge.from('79d0be0f3cb191c80d108359c64d22984a77ad8b99433814be31db0b6e9e7975'),
        );
        const storeResult2 = challengeStorage.storeChallenge(sessionId2, challenge2);
        assert(storeResult2.ok);

        const response = await app.inject({
            method: 'POST',
            url: '/storage/add',
            payload: {
                publicKey: publicKey.toString(),
                ownerId: ownerId.toString(),
                size: size20,
                challenge: challenge2.toString(),
                sessionId: sessionId2.toString(),
                proof: getOrThrowTest(Proof.from('deadbeef')).toString(),
                certificateChain,
                deviceModel,
            },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error).toBe('NoStorageAllowance');
    });
});
