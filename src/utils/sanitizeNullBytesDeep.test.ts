import { describe, expect, it } from 'vitest';

import { sanitizeNullBytesDeep } from './sanitizeNullBytesDeep.js';

describe('sanitizeNullBytesDeep', () => {
    it('removes null bytes from a string', () => {
        const input = '\u0000hello\u0000';
        const out = sanitizeNullBytesDeep(input);
        expect(out).toBe('hello');
    });

    it('sanitizes nested objects and arrays in-place', () => {
        const obj: any = {
            a: 'ab\u0000c',
            nested: { x: '\u0000y' },
            arr: ['z\u0000'],
        };

        const ret = sanitizeNullBytesDeep(obj);
        // returns the same object reference (sanitizes in-place)
        expect(ret).toBe(obj);
        expect(obj.a).toBe('abc');
        expect(obj.nested.x).toBe('y');
        expect(obj.arr[0]).toBe('z');
    });

    it('handles cyclic structures without infinite loop', () => {
        const a: any = { v: '\u0000val' };
        a.self = a;

        const ret = sanitizeNullBytesDeep(a);
        expect(ret).toBe(a);
        expect(a.v).toBe('val');
        expect(a.self).toBe(a);
    });

    it('leaves non-string primitives unchanged', () => {
        expect(sanitizeNullBytesDeep(123)).toBe(123);
        expect(sanitizeNullBytesDeep(true)).toBe(true);
        expect(sanitizeNullBytesDeep(null)).toBe(null);
        expect(sanitizeNullBytesDeep(undefined)).toBe(undefined);
    });
});
