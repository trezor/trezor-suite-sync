import Fastify from 'fastify';
import { assert, beforeEach, describe, expect, it } from 'vitest';

import { storageRegisterEndpoint } from './storageRegisterEndpoint.js';
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

// This test file uses the REAL verifyAuthenticityProof function (no mocks)
// to test actual certificate and signature validation, similar to the cryptography test example

const publicKey1 = getOrThrowTest(PublicKey.from('test-pubkey-123'));
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

describe('POST /storage/register - Real Cryptography Tests', () => {
    beforeEach(() => {
        // Clear any state between tests
    });

    it('returns 400 when device certificate is malformed', async () => {
        const { app, challengeStorage } = await createApp();

        const sessionId = getOrThrowTest(SessionId.from('session-malformed-cert'));
        const challenge = getOrThrowTest(Challenge.from('challenge-malformed-cert'));
        challengeStorage.storeChallenge(sessionId, challenge);

        const response = await app.inject({
            method: 'POST',
            url: '/storage/register',
            payload: {
                publicKey: publicKey1.toString(),
                size: size100,
                challenge: challenge.toString(),
                sessionId: sessionId.toString(),
                proof: getOrThrowTest(Proof.from('any-proof')).toString(),
                certificateChain: {
                    deviceCert: 'invalid-cert-format-not-hex',
                    caCert: CA_CERT_OPTIGA,
                },
                deviceModel: 'T2B1',
            },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error).toBe('CertificateValidationFailed');
    });

    it('returns 400 when CA certificate is malformed', async () => {
        const { app, challengeStorage } = await createApp();

        const sessionId = getOrThrowTest(SessionId.from('session-malformed-ca'));
        const challenge = getOrThrowTest(Challenge.from('challenge-malformed-ca'));
        challengeStorage.storeChallenge(sessionId, challenge);

        const response = await app.inject({
            method: 'POST',
            url: '/storage/register',
            payload: {
                publicKey: publicKey1.toString(),
                size: size100,
                challenge: challenge.toString(),
                sessionId: sessionId.toString(),
                proof: getOrThrowTest(Proof.from('any-proof')).toString(),
                certificateChain: {
                    deviceCert: DEVICE_CERT_OPTIGA,
                    caCert: 'invalid-ca-cert-format-not-hex',
                },
                deviceModel: 'T2B1',
            },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error).toBe('CertificateValidationFailed');
    });

    it('returns 400 when certificate chain is invalid (wrong CA)', async () => {
        const { app, challengeStorage } = await createApp();

        const sessionId = getOrThrowTest(SessionId.from('session-wrong-ca'));
        const challenge = getOrThrowTest(Challenge.from('challenge-wrong-ca'));
        challengeStorage.storeChallenge(sessionId, challenge);

        // Using device cert as CA cert (invalid chain)
        const response = await app.inject({
            method: 'POST',
            url: '/storage/register',
            payload: {
                publicKey: publicKey1.toString(),
                size: size100,
                challenge: challenge.toString(),
                sessionId: sessionId.toString(),
                proof: getOrThrowTest(Proof.from('any-proof')).toString(),
                certificateChain: {
                    deviceCert: DEVICE_CERT_OPTIGA,
                    caCert: DEVICE_CERT_OPTIGA, // Wrong: using device cert as CA
                },
                deviceModel: 'T2B1',
            },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        // Invalid certificate chain can result in either error depending on where validation fails
        expect(['CertificateValidationFailed', 'ProofValidationFailed']).toContain(body.error);
    });

    it('returns 400 when root pubkey is not found in config', async () => {
        const { app, challengeStorage } = await createApp();

        const sessionId = getOrThrowTest(SessionId.from('session-no-root'));
        const challenge = getOrThrowTest(Challenge.from('challenge-no-root'));
        challengeStorage.storeChallenge(sessionId, challenge);

        // Using valid certificates but they won't match any root pubkey in config
        // (assuming the config doesn't have the root pubkey for these certs)
        const response = await app.inject({
            method: 'POST',
            url: '/storage/register',
            payload: {
                publicKey: publicKey1.toString(),
                size: size100,
                challenge: challenge.toString(),
                sessionId: sessionId.toString(),
                proof: getOrThrowTest(Proof.from('any-proof')).toString(),
                certificateChain: {
                    deviceCert: DEVICE_CERT_OPTIGA,
                    caCert: CA_CERT_OPTIGA,
                },
                deviceModel: 'T3B1', // Device model that might not have matching root pubkey
            },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        // Could be either CertificateValidationFailed or ProofValidationFailed
        expect(['CertificateValidationFailed', 'ProofValidationFailed']).toContain(body.error);
    });

    // Note: Full signature verification with real signatures would require:
    // 1. A real signature signed by a Trezor device's private key
    // 2. The signature must be for the exact payload format:
    //    "EvoluSignRegistrationRequestV1:"|publicKey|challenge|size
    // 3. This would need to be generated by an actual Trezor device during registration
    //
    // The SIGNATURE_OPTIGA constant in unit tests is for "AuthenticateDevice:"|challenge format,
    // not for the Evolu registration format, so it cannot be used here.
});
