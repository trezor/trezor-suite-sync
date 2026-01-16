import { OwnerId } from '@evolu/common';

import type { Challenge, SessionId } from '../challengeStorage/createChallengeStorage.js';
import type { PublicKey, Size } from "../limitStorage/limitStorage.js";

export type PubkeyStorageLimitsTable = {
    publicKey: PublicKey;
    totalStorageSize: Size;
    unspendStorageSize: Size;
};

export type OwnerStorageLimitsTable = {
    ownerId: OwnerId;
    storageLimit: Size;
};

export type ChallengesTable = {
    sessionId: SessionId;
    challenge: Challenge;
    createdAt: number;
};

export type Database = {
    pubkey_storage_limits: PubkeyStorageLimitsTable;
    owner_storage_limits: OwnerStorageLimitsTable;
    challenges: ChallengesTable;
};
