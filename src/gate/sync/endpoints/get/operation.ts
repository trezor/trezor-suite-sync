import { OwnerId } from '@evolu/common';

import { Result } from '../../../types.js';

type SyncError = { type: 'NotImplemented' };

export type SyncOperationDeps = {};

export type SyncOperationInput = {
    ownerId: OwnerId;
};

export const syncOperation = (
    deps: SyncOperationDeps,
    input: SyncOperationInput,
): Result<SyncOperationInput, SyncError> =>
    // TODO: Implement sync logic
    ({
        ok: true,
        value: {
            ownerId: input.ownerId,
        },
    });
