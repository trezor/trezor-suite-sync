import { err, ok, type Sqlite } from '@evolu/common';
import { getLimitsForPubkey } from './getLimitsForPubkey.js';
import { noStorageAllowanceErr } from '../../errors.js';

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
    // Todo: this operation is not atomic! Implement some lock/transactionality

    const limitsResult = getLimitsForPubkey({ sqlite, publicKey });

    if (!limitsResult.ok) {
        return limitsResult;
    }

    if (limitsResult.value === null) {
        return err(noStorageAllowanceErr('No allowance for the given publicKey'));
    }

    if (limitsResult.value.unspendStorageSize >= size) {
        return err(noStorageAllowanceErr('Unsufficient space for the given publicKey'));
    }

    return ok(null);
};
