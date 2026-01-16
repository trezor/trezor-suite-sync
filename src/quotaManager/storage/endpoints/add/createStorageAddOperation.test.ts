import { OwnerId, err, ok } from '@evolu/common';
import { verifySignatureP256 } from '@trezor/device-authenticity';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    type StorageAddInputParsed,
    createStorageAddOperation,
} from './createStorageAddOperation.js';
import { consistencyError, noSpaceAllowanceErr } from '../../../../errors.js';
import { getOrThrowTest } from '../../../../getOrThrowTest.js';
import {
    Challenge,
    SessionId,
} from '../../../../storage/challengeStorage/createChallengeStorage.js';
import { ValidateAndConsumeChallenge } from '../../../../storage/challengeStorage/methods/createValidateAndConsumeChallenge.js';
import { Proof, PublicKey, Size } from '../../../../storage/limitStorage/limitStorage.js';
import { AssignSpaceToOwner } from '../../../../storage/limitStorage/methods/createAssignSpaceToOwner.js';

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
const proof = getOrThrowTest(Proof.from('deadbeef'));

vi.mock('@trezor/device-authenticity', () => ({
    verifySignatureP256: vi.fn(),
}));

const deviceModel = 'T2B1';

const createMockInput = (overrides?: Partial<StorageAddInputParsed>): StorageAddInputParsed => ({
    publicKey,
    ownerId,
    size: size20,
    challenge: challengeValue,
    sessionId,
    proof,
    deviceModel,
    ...overrides,
});

describe(createStorageAddOperation.name, () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(verifySignatureP256).mockResolvedValue(true);
    });

    it('assigns space when proof and challenge are valid', async () => {
        const validateAndConsumeChallenge: ValidateAndConsumeChallenge = () =>
            Promise.resolve(ok(true));

        const assignSpaceToOwner: AssignSpaceToOwner = () =>
            Promise.resolve(
                ok({
                    publicKeyLimits: {
                        totalStorageSize: size50,
                        unspendStorageSize: 30 as Size,
                    },
                    ownerStorageLimit: 20 as Size,
                }),
            );

        const storageAddOperation = createStorageAddOperation({
            validateAndConsumeChallenge,
            assignSpaceToOwner,
        });
        const result = await storageAddOperation(createMockInput());

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.publicKeyUnspentSpace).toBe(30);
            expect(result.value.ownerTotalSpace).toBe(20);
        }
    });

    it('allows burning space when ownerId equals zero', async () => {
        const validateAndConsumeChallenge: ValidateAndConsumeChallenge = () =>
            Promise.resolve(ok(true));

        const assignSpaceToOwner: AssignSpaceToOwner = () =>
            Promise.resolve(
                ok({
                    publicKeyLimits: {
                        totalStorageSize: size50,
                        unspendStorageSize: 30 as Size,
                    },
                    ownerStorageLimit: null,
                }),
            );

        const storageAddOperation = createStorageAddOperation({
            validateAndConsumeChallenge,
            assignSpaceToOwner,
        });
        const result = await storageAddOperation(createMockInput({ ownerId: burnOwnerId }));

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.publicKeyUnspentSpace).toBe(30);
            expect(result.value.ownerTotalSpace).toBeNull();
        }
    });

    it('returns ChallengeValidationFailed when challenge is invalid', async () => {
        const validateAndConsumeChallenge: ValidateAndConsumeChallenge = () =>
            Promise.resolve(ok(false));

        const assignSpaceToOwner: AssignSpaceToOwner = () =>
            Promise.resolve(
                ok({
                    publicKeyLimits: {
                        totalStorageSize: size50,
                        unspendStorageSize: size50 as Size,
                    },
                    ownerStorageLimit: 20 as Size,
                }),
            );

        const storageAddOperation = createStorageAddOperation({
            validateAndConsumeChallenge,
            assignSpaceToOwner,
        });
        const result = await storageAddOperation(createMockInput());

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('ChallengeValidationFailed');
        }
    });

    it('returns ChallengeValidationFailed when challenge is consumed', async () => {
        const state = { hasBeenConsumed: false };

        const validateAndConsumeChallenge: ValidateAndConsumeChallenge = () => {
            if (!state.hasBeenConsumed) {
                state.hasBeenConsumed = true;

                return Promise.resolve(ok(true));
            }

            return Promise.resolve(ok(false));
        };

        const assignSpaceToOwner: AssignSpaceToOwner = () =>
            Promise.resolve(
                ok({
                    publicKeyLimits: {
                        totalStorageSize: size50,
                        unspendStorageSize: 30 as Size,
                    },
                    ownerStorageLimit: 20 as Size,
                }),
            );

        const input = createMockInput();

        const storageAddOperation = createStorageAddOperation({
            validateAndConsumeChallenge,
            assignSpaceToOwner,
        });
        const result1 = await storageAddOperation(input);
        expect(result1.ok).toBe(true);

        const result2 = await storageAddOperation(input);
        expect(result2.ok).toBe(false);
        if (!result2.ok) {
            expect(result2.error).toBe('ChallengeValidationFailed');
        }
    });

    it('returns ProofValidationFailed when proof verification fails', async () => {
        vi.mocked(verifySignatureP256).mockResolvedValue(false);

        const validateAndConsumeChallenge: ValidateAndConsumeChallenge = () =>
            Promise.resolve(ok(true));

        const assignSpaceToOwner: AssignSpaceToOwner = () =>
            Promise.resolve(
                ok({
                    publicKeyLimits: {
                        totalStorageSize: size50,
                        unspendStorageSize: size50,
                    },
                    ownerStorageLimit: 20 as Size,
                }),
            );

        const storageAddOperation = createStorageAddOperation({
            validateAndConsumeChallenge,
            assignSpaceToOwner,
        });
        const result = await storageAddOperation(createMockInput());

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('ProofValidationFailed');
        }
    });

    it('returns NoStorageAllowance when there is insufficient unspent space', async () => {
        const validateAndConsumeChallenge: ValidateAndConsumeChallenge = () =>
            Promise.resolve(ok(true));

        const assignSpaceToOwner: AssignSpaceToOwner = () =>
            Promise.resolve(err(noSpaceAllowanceErr('Insufficient unspent space')));

        const storageAddOperation = createStorageAddOperation({
            validateAndConsumeChallenge,
            assignSpaceToOwner,
        });
        const result = await storageAddOperation(createMockInput());

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('NoStorageAllowance');
        }
    });

    it('returns ConsistencyError when limit storage returns consistency error', async () => {
        const validateAndConsumeChallenge: ValidateAndConsumeChallenge = () =>
            Promise.resolve(ok(true));

        const assignSpaceToOwner: AssignSpaceToOwner = () =>
            Promise.resolve(err(consistencyError('Public key limits disappeared')));

        const storageAddOperation = createStorageAddOperation({
            validateAndConsumeChallenge,
            assignSpaceToOwner,
        });
        const result = await storageAddOperation(createMockInput());

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('ConsistencyError');
        }
    });

    it('returns SqliteError when challenge storage returns error', async () => {
        const validateAndConsumeChallenge: ValidateAndConsumeChallenge = () =>
            Promise.resolve(
                err({ type: 'SqliteError', error: new Error('Test SQLite error') } as any),
            );

        const assignSpaceToOwner: AssignSpaceToOwner = () =>
            Promise.resolve(
                ok({
                    publicKeyLimits: {
                        totalStorageSize: size50,
                        unspendStorageSize: size50,
                    },
                    ownerStorageLimit: 20 as Size,
                }),
            );

        const storageAddOperation = createStorageAddOperation({
            validateAndConsumeChallenge,
            assignSpaceToOwner,
        });
        const result = await storageAddOperation(createMockInput());

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe('SqliteError');
        }
    });
});
