import { OwnerId, getOrThrow, ok } from '@evolu/common';
import { describe, expect, it, vi } from 'vitest';

import { createStorageService } from './storage.service.js';
import { PublicKey, Size } from '../../storage/limitStorage/limitStorage.js';

const size150 = getOrThrow(Size.from(150));
const size200 = getOrThrow(Size.from(200));

const ownerId = getOrThrow(OwnerId.from('B4Tjjey5WmWnchjGDF123'));
const ownerIdNonExistent = getOrThrow(OwnerId.from('FFFFFFFFFFFFFFFFFFFFF'));
const publicKey = getOrThrow(PublicKey.from('test-pubkey'));

describe('StorageService', () => {
    describe('askStorageByOwnerId', () => {
        it('returns total space for ownerId', () => {
            const limitStorage = {
                getLimitForOwner: vi.fn(() => ok(100)),
                getLimitForPubkey: vi.fn(),
                transferSpaceLimitToOwner: vi.fn(),
                addLimitToPubkey: vi.fn(),
            };

            const service = createStorageService({ limitStorage });
            const result = service.askStorageByOwnerId(ownerId);

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value).toEqual({ totalSpace: 100 });
            }
            expect(limitStorage.getLimitForOwner).toHaveBeenCalledWith({ ownerId });
        });

        it('returns OwnerNotFound error when owner does not exist', () => {
            const limitStorage = {
                getLimitForOwner: vi.fn(() => ok(null)),
                getLimitForPubkey: vi.fn(),
                transferSpaceLimitToOwner: vi.fn(),
                addLimitToPubkey: vi.fn(),
            };

            const service = createStorageService({ limitStorage });
            const result = service.askStorageByOwnerId(ownerIdNonExistent);

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.type).toBe('OwnerNotFound');
            }
        });

        it('handles zero storage limits', () => {
            const limitStorage = {
                getLimitForOwner: vi.fn(() => ok(0)),
                getLimitForPubkey: vi.fn(),
                transferSpaceLimitToOwner: vi.fn(),
                addLimitToPubkey: vi.fn(),
            };

            const service = createStorageService({ limitStorage });
            const result = service.askStorageByOwnerId(ownerId);

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value).toEqual({ totalSpace: 0 });
            }
        });

        it('handles large storage limits', () => {
            const limitStorage = {
                getLimitForOwner: vi.fn(() => ok(999999999)),
                getLimitForPubkey: vi.fn(),
                transferSpaceLimitToOwner: vi.fn(),
                addLimitToPubkey: vi.fn(),
            };

            const service = createStorageService({ limitStorage });
            const result = service.askStorageByOwnerId(ownerId);

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value).toEqual({ totalSpace: 999999999 });
            }
        });
    });

    describe('askStorageByPublicKey', () => {
        it('returns total and unspent space for publicKey', () => {
            const limitStorage = {
                getLimitForOwner: vi.fn(),
                getLimitForPubkey: vi.fn(() =>
                    ok({ totalStorageSize: size200, unspendStorageSize: size150 }),
                ),
                transferSpaceLimitToOwner: vi.fn(),
                addLimitToPubkey: vi.fn(),
            };

            const service = createStorageService({ limitStorage });
            const result = service.askStorageByPublicKey(publicKey);

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value).toEqual({
                    totalSpace: size200,
                    unspentSpace: size150,
                });
            }
            expect(limitStorage.getLimitForPubkey).toHaveBeenCalledWith({ publicKey });
        });

        it('returns PublicKeyNotFound error when public key does not exist', () => {
            const limitStorage = {
                getLimitForOwner: vi.fn(),
                getLimitForPubkey: vi.fn(() => ok(null)),
                transferSpaceLimitToOwner: vi.fn(),
                addLimitToPubkey: vi.fn(),
            };

            const service = createStorageService({ limitStorage });
            const result = service.askStorageByPublicKey(publicKey);

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.type).toBe('PublicKeyNotFound');
            }
        });

        it('handles large storage limits', () => {
            const largeSize = getOrThrow(Size.from(999999999));
            const limitStorage = {
                getLimitForOwner: vi.fn(),
                getLimitForPubkey: vi.fn(() =>
                    ok({
                        totalStorageSize: largeSize,
                        unspendStorageSize: getOrThrow(Size.from(888888888)),
                    }),
                ),
                transferSpaceLimitToOwner: vi.fn(),
                addLimitToPubkey: vi.fn(),
            };

            const service = createStorageService({ limitStorage });
            const result = service.askStorageByPublicKey(publicKey);

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.value.totalSpace).toBe(999999999);
                expect(result.value.unspentSpace).toBe(888888888);
            }
        });

        it('returns SqliteError when database fails', () => {
            const limitStorage = {
                getLimitForOwner: vi.fn(),
                getLimitForPubkey: vi.fn(() => ({
                    ok: false as const,
                    error: {
                        type: 'SqliteError' as const,
                        error: {
                            type: 'TransferableError' as const,
                            error: new Error('Database operation failed'),
                        },
                    },
                })),
                transferSpaceLimitToOwner: vi.fn(),
                addLimitToPubkey: vi.fn(),
            };

            const service = createStorageService({ limitStorage });
            const result = service.askStorageByPublicKey(publicKey);

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.type).toBe('SqliteError');
            }
        });
    });
});
