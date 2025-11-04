import { Result, getOrThrow } from '@evolu/common';

export const getOrThrowTest = <T, E>(result: Result<T, E>): T => {
    try {
        return getOrThrow(result);
    } catch (e) {
        const { cause } = e as Error;

        throw new Error(`getOrThrow: ${JSON.stringify(cause, null, 2)}`, { cause });
    }
};
