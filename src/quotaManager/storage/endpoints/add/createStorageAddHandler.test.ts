import { OwnerId } from '@evolu/common';
import { verifySignatureP256 } from '@trezor/device-authenticity';
import Fastify from 'fastify';
import { assert, beforeEach, describe, expect, it, vi } from 'vitest';

import { createStorageAddHandler } from './createStorageAddHandler.js';
import { createStorageAddOperation } from './createStorageAddOperation.js';
import { storageAddRequestSchema } from './storageAddSchema.js';
import { getOrThrowTest } from '../../../../getOrThrowTest.js';
import {
    Challenge,
    SessionId,
} from '../../../../storage/challengeStorage/createChallengeStorage.js';
import { createDeleteChallenge } from '../../../../storage/challengeStorage/methods/createDeleteChallenge.js';
import { createStoreChallenge } from '../../../../storage/challengeStorage/methods/createStoreChallenge.js';
import { createValidateAndConsumeChallenge } from '../../../../storage/challengeStorage/methods/createValidateAndConsumeChallenge.js';
import { Proof, PublicKey, Size } from '../../../../storage/limitStorage/limitStorage.js';
import { createAddLimitToPubkey } from '../../../../storage/limitStorage/methods/createAddLimitToPubkey.js';
import { createAssignSpaceToOwner } from '../../../../storage/limitStorage/methods/createAssignSpaceToOwner.js';
import { createGetLimitsForOwner } from '../../../../storage/limitStorage/methods/createGetLimitsForOwner.js';
import { createGetLimitsForPubkey } from '../../../../storage/limitStorage/methods/createGetLimitsForPubkey.js';
import { createTestDatabase } from '../../../../storage/postgres/createTestDatabase.js';
import { evoluValidatorCompiler } from '../../../evoluValidatorCompiler.js';

vi.mock('@trezor/device-authenticity', () => ({
    verifySignatureP256: vi.fn(),
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

/**
 * This is composition root of the app for tests. This is a lot of code as this is a heavy
 * integration test.
 */
const createApp = async () => {
    const createTime = () => Date.now(); // Todo: freeze

    const db = await createTestDatabase();

    const deleteChallenge = createDeleteChallenge({ db });
    const getLimitsForPubkey = createGetLimitsForPubkey({ db });
    const addLimitToPubkey = createAddLimitToPubkey({ db, getLimitsForPubkey });
    await addLimitToPubkey({ publicKey, size: size50 });

    const validateAndConsumeChallenge = createValidateAndConsumeChallenge({
        db,
        createTime,
        deleteChallenge,
    });
    const getLimitsForOwner = createGetLimitsForOwner({ db });
    const assignSpaceToOwner = createAssignSpaceToOwner({
        db,
        getLimitsForPubkey,
        getLimitsForOwner,
    });
    const storeChallenge = createStoreChallenge({ db, createTime });
    const storageAddOperation = createStorageAddOperation({
        assignSpaceToOwner,
        validateAndConsumeChallenge,
    });

    const app = Fastify();
    app.setValidatorCompiler(evoluValidatorCompiler);
    app.post(
        '/storage/add',
        storageAddRequestSchema,
        createStorageAddHandler({ storageAddOperation }),
    );

    return { app, storeChallenge };
};

describe(createStorageAddHandler.name, () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(verifySignatureP256).mockResolvedValue(true);
    });

    it('successfully assigns space and returns 200 with correct response format', async () => {
        const { app, storeChallenge } = await createApp();

        const sessionId = getOrThrowTest(SessionId.from('session-123'));
        const challenge = getOrThrowTest(
            Challenge.from('29d0be0f3cb191c80d108359c64d22984a77ad8b99433814be31db0b6e9e7920'),
        );
        const storeResult = await storeChallenge({ sessionId, challenge });
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
        const { app, storeChallenge } = await createApp();

        const sessionId = getOrThrowTest(SessionId.from('session-456'));
        const challenge = getOrThrowTest(
            Challenge.from('39d0be0f3cb191c80d108359c64d22984a77ad8b99433814be31db0b6e9e7931'),
        );
        const storeResult = await storeChallenge({ sessionId, challenge });
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
            },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error).toBe('ChallengeValidationFailed');
    });

    it('returns 400 when proof verification fails', async () => {
        vi.mocked(verifySignatureP256).mockResolvedValue(false);

        const { app, storeChallenge } = await createApp();

        const sessionId = getOrThrowTest(SessionId.from('session-proof-fail'));
        const challenge = getOrThrowTest(
            Challenge.from('59d0be0f3cb191c80d108359c64d22984a77ad8b99433814be31db0b6e9e7953'),
        );
        const storeResult = await storeChallenge({ sessionId, challenge });
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
            },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error).toBe('ProofValidationFailed');
    });

    it('returns 400 when there is insufficient unspent space', async () => {
        const { app, storeChallenge } = await createApp();

        const sessionId1 = getOrThrowTest(SessionId.from('session-1'));
        const challenge1 = getOrThrowTest(
            Challenge.from('69d0be0f3cb191c80d108359c64d22984a77ad8b99433814be31db0b6e9e7964'),
        );
        const storeResult1 = await storeChallenge({
            sessionId: sessionId1,
            challenge: challenge1,
        });
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
            },
        });

        expect(firstResponse.statusCode).toBe(200);

        const sessionId2 = getOrThrowTest(SessionId.from('session-2'));
        const challenge2 = getOrThrowTest(
            Challenge.from('79d0be0f3cb191c80d108359c64d22984a77ad8b99433814be31db0b6e9e7975'),
        );
        const storeResult2 = await storeChallenge({
            sessionId: sessionId2,
            challenge: challenge2,
        });
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
            },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error).toBe('NoStorageAllowance');
    });
});
