import { Ok } from '@evolu/common';

/**
 * @deprecated Use InferOk from Evolu after update to newer version
 */
export type UnwrapOk<T> = T extends Ok<infer U> ? U : never;
