export type AskByOwnerResponse = {
    totalSpace: number;
};

export type AskByPublicKeyResponse = {
    totalSpace: number;
    unspentSpace: number;
};

export const serializeAskByOwnerResponse = (data: { totalSpace: number }): AskByOwnerResponse =>
    data;

export const serializeAskByPublicKeyResponse = (data: {
    totalSpace: number;
    unspentSpace: number;
}): AskByPublicKeyResponse => data;
