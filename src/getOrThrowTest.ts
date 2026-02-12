import { Result, getOrThrow } from '@evolu/common';

export const getOrThrowTest = <T, E>(result: Result<T, E>): T => {
    try {
        return getOrThrow(result);
    } catch (e) {
        if (e instanceof Error) {
            throw new Error(`getOrThrow: ${e.message}`, { cause: e });
        }

        throw new Error(`getOrThrow: ${String(e)}`, { cause: e });
    }
};
