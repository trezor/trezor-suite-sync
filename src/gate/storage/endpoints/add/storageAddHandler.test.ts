import { OwnerId } from '@evolu/common';
import type { JsonSchemaToTsProvider } from '@fastify/type-provider-json-schema-to-ts';
import Fastify from 'fastify';
import { assert, describe, expect, it, vi } from 'vitest';

import { storageAddEndpoint } from './storageAddEndpoint.js';
import { storageAddHandler } from './storageAddHandler.js';
import type { StorageAddDeps } from './storageAddOperation.js';
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

type VerifyProofFn = NonNullable<StorageAddDeps['verifySignature']>;

const publicKey = getOrThrowTest(
    PublicKey.from(
        '049bbf06dad9ab5905e05471ce16d5222c89c2caa39f26267ac0747129885fbd441bcc7fa84de120a36755daf30a6f47e8c0d4bddc15036ed2a3447dfa7a1d3e88',
    ),
);
const ownerId = getOrThrowTest(OwnerId.from('StbvdTPxk80z0cNVwDJg6g'));
const burnOwnerId = '0' as OwnerId;
const size50 = getOrThrowTest(Size.from(50));
const size20 = getOrThrowTest(Size.from(20));
const challengeValue = getOrThrowTest(
    Challenge.from('29d0be0f3cb191c80d108359c64d22984a77ad8b99433814be31db0b6e9e7920'),
);
const sessionId = getOrThrowTest(SessionId.from('session-1'));
const anotherSessionId = getOrThrowTest(SessionId.from('session-2'));
const proof = getOrThrowTest(Proof.from('deadbeef'));
const anotherChallengeValue = getOrThrowTest(
    Challenge.from('3bd0be0f3cb191c80d108359c64d22984a77ad8b99433814be31db0b6e9e7931'),
);

const createApp = async (verifySignatureMock?: ReturnType<typeof vi.fn<VerifyProofFn>>) => {
    const sqlite = await prepareSqlite({ inMemory: true });
    assert(sqlite.ok);

    const limitStorageResult = createLimitStorage({ sqlite: sqlite.value });
    assert(limitStorageResult.ok);

    const challengeStorageResult = createChallengeStorage({ sqlite: sqlite.value });
    assert(challengeStorageResult.ok);

    addLimitToPubkey({ sqlite: sqlite.value, publicKey, size: size50 });

    const verifySignature: VerifyProofFn =
        verifySignatureMock ?? vi.fn<VerifyProofFn>().mockResolvedValue(true);

    const app = Fastify().withTypeProvider<JsonSchemaToTsProvider>();

    app.post(
        '/storage/add',
        storageAddEndpoint.schema,
        storageAddEndpoint.createHandler({
            limitStorage: limitStorageResult.value,
            challengeStorage: challengeStorageResult.value,
            verifySignature,
        }),
    );

    const storeChallenge = (
        session: SessionId = sessionId,
        challenge: Challenge = challengeValue,
    ) => {
        const result = challengeStorageResult.value.storeChallenge(session, challenge);
        assert(result.ok);
    };

    return {
        app,
        storeChallenge,
        verifySignature,
    } as const;
};

describe(storageAddHandler.name, () => {
    it('assigns space and returns new limits', async () => {
        const { app, storeChallenge } = await createApp();
        storeChallenge();

        const response = await app.inject({
            method: 'POST',
            url: '/storage/add',
            payload: {
                publicKey,
                ownerId,
                size: size20,
                challenge: challengeValue,
                sessionId,
                proof,
            },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.publicKeyUnspentSpace).toBe(30);
        expect(body.ownerTotalSpace).toBe(20);
    });

    it('returns 400 when schema validation fails', async () => {
        const { app } = await createApp();

        const response = await app.inject({
            method: 'POST',
            url: '/storage/add',
            payload: {},
        });

        expect(response.statusCode).toBe(400);
    });

    it('returns 400 when challenge validation fails', async () => {
        const { app } = await createApp();

        const response = await app.inject({
            method: 'POST',
            url: '/storage/add',
            payload: {
                publicKey,
                ownerId,
                size: size20,
                challenge: challengeValue,
                sessionId,
                proof,
            },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error).toBe('ChallengeValidationFailed');
    });

    it('returns 400 when proof verification fails', async () => {
        const verifySignature = vi.fn<VerifyProofFn>().mockResolvedValue(false);
        const { app, storeChallenge } = await createApp(verifySignature);
        storeChallenge();

        const response = await app.inject({
            method: 'POST',
            url: '/storage/add',
            payload: {
                publicKey,
                ownerId,
                size: size20,
                challenge: challengeValue,
                sessionId,
                proof,
            },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error).toBe('ProofValidationFailed');
    });

    it('allows burning space when ownerId is zero', async () => {
        const { app, storeChallenge } = await createApp();
        storeChallenge();

        const response = await app.inject({
            method: 'POST',
            url: '/storage/add',
            payload: {
                publicKey,
                ownerId: burnOwnerId,
                size: size20,
                challenge: challengeValue,
                sessionId,
                proof,
            },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.publicKeyUnspentSpace).toBe(30);
        expect(body.ownerTotalSpace).toBeNull();
    });

    it('returns 400 when unspent space is insufficient', async () => {
        const { app, storeChallenge } = await createApp();
        storeChallenge();

        const firstResponse = await app.inject({
            method: 'POST',
            url: '/storage/add',
            payload: {
                publicKey,
                ownerId,
                size: size50,
                challenge: challengeValue,
                sessionId,
                proof,
            },
        });

        expect(firstResponse.statusCode).toBe(200);

        storeChallenge(anotherSessionId, anotherChallengeValue);

        const response = await app.inject({
            method: 'POST',
            url: '/storage/add',
            payload: {
                publicKey,
                ownerId,
                size: size20,
                challenge: anotherChallengeValue,
                sessionId: anotherSessionId,
                proof,
            },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error).toBe('NoStorageAllowance');
    });
});
