import type { Sqlite } from '@evolu/common';
import { PUBKEY_STORAGE_LIMITS_TABLE_NAME } from '../tables.js';

export type TransferSpaceLimitToOwnerParams = {
    sqlite: Sqlite;
    publicKey: string;
    ownerId: string;
    size: number; // To be transferred
};

export const transferSpaceLimitToOwner = ({
    sqlite,
    publicKey,
    ownerId,
    size,
}: TransferSpaceLimitToOwnerParams) => {
    // Todo: implement

    return null;
};
