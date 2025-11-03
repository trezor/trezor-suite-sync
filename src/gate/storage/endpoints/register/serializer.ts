export type RegisterResponse = {
    totalStorageSize: number;
    unspendStorageSize: number;
};

export const serializeRegisterResponse = (data: {
    totalStorageSize: number;
    unspendStorageSize: number;
}): RegisterResponse => data;
