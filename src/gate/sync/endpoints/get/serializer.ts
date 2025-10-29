import { OwnerId } from '@evolu/common';

export type SyncGetResponse = {
    ownerId: OwnerId;
};

// TODO
export const serializeSyncGetResponse = (data: { ownerId: OwnerId }): SyncGetResponse => ({
    ownerId: data.ownerId,
});
