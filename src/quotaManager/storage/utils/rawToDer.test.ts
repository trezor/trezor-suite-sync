import { describe, expect, it } from 'vitest';

import { rawToDer } from './rawToDer.js';

describe('rawToDer', () => {
    it('converts raw signature to DER with trimmed leading zeros', () => {
        const r = Buffer.concat([Buffer.alloc(31, 0x00), Buffer.from([0x01])]);
        const s = Buffer.concat([Buffer.alloc(31, 0x00), Buffer.from([0x02])]);

        const raw = Buffer.concat([r, s]);
        const der = rawToDer(raw);

        expect(der.toString('hex')).toBe('3006020101020102');
    });

    it('adds leading zero when high bit is set', () => {
        const r = Buffer.concat([Buffer.from([0x80]), Buffer.alloc(31, 0x00)]);
        const s = Buffer.concat([Buffer.alloc(31, 0x00), Buffer.from([0x7f])]);

        const raw = Buffer.concat([r, s]);
        const der = rawToDer(raw);

        expect(der.toString('hex')).toBe(
            '3026022100800000000000000000000000000000000000000000000000000000000000000002017f',
        );
    });
});
