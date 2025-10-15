export type ConsistencyError = {
    type: 'ConsistencyError';
    message: string;
};

export const consistencyError = (message: string): ConsistencyError => ({
    type: 'ConsistencyError',
    message,
});

type NoSpaceAllowance = {
    type: 'NoStorageAllowance';
    message: string;
};

export const noSpaceAllowanceErr = (message: string): NoSpaceAllowance => ({
    type: 'NoStorageAllowance',
    message,
});
