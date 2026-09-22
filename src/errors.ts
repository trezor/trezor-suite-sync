export type ConsistencyError = {
    type: 'ConsistencyError';
    message: string;
};

export const consistencyError = (message: string): ConsistencyError => ({
    type: 'ConsistencyError',
    message,
});

export type NoSpaceAllowance = {
    type: 'NoStorageAllowance';
    message: string;
};

export const noSpaceAllowanceErr = (message: string): NoSpaceAllowance => ({
    type: 'NoStorageAllowance',
    message,
});

const hasErrorType = (error: unknown, type: string): boolean =>
    typeof error === 'object' && error !== null && 'type' in error && error.type === type;

export const isNoSpaceAllowance = (error: unknown): error is NoSpaceAllowance =>
    hasErrorType(error, 'NoStorageAllowance');

export const isConsistencyError = (error: unknown): error is ConsistencyError =>
    hasErrorType(error, 'ConsistencyError');
