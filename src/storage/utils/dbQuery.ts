import { type Result, err, ok } from '@evolu/common';

export type DatabaseError = {
    readonly type: 'DatabaseError';
    readonly error: unknown;
};

export const handleKyselyError = (error: unknown): DatabaseError => ({
    type: 'DatabaseError',
    error,
});

/**
 * Necessary helper function to catch DB errors async.
 */
export const dbQuery = async <T>(fn: () => Promise<T>): Promise<Result<T, DatabaseError>> => {
    try {
        const result = await fn();

        return ok(result);
    } catch (error) {
        return err(handleKyselyError(error));
    }
};
