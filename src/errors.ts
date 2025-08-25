export type ConsistencyError = {
    type: 'ConsistencyError';
    message: string;
};

export const consistencyError = (message: string): ConsistencyError => ({
    type: 'ConsistencyError',
    message,
});

type NoStorageAllowance = {
    type: 'NoStorageAllowance';
    message: string;
};

export const noStorageAllowanceErr = (message: string): NoStorageAllowance => ({
    type: 'NoStorageAllowance',
    message,
});
