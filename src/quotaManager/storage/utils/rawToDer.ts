/**
 * Convert a 64-byte raw (r‖s) ECDSA signature into DER encoding.
 * Leading zeros are trimmed and a leading 0x00 is injected when the high bit is set,
 * keeping each integer in a canonical positive representation.
 */
export const rawToDer = (raw: Buffer): Buffer => {
    const encodeInt = (slice: Buffer) => {
        let i = 0;
        while (i < slice.length && slice[i] === 0) i += 1;
        let v = slice.slice(i);
        // @ts-expect-error
        if (v[0] & 0x80) v = Buffer.concat([Buffer.from([0]), v]);

        return Buffer.concat([Buffer.from([0x02, v.length]), v]);
    };

    const r = encodeInt(raw.subarray(0, 32));
    const s = encodeInt(raw.subarray(32));
    const seq = Buffer.concat([r, s]);

    return Buffer.concat([Buffer.from([0x30, seq.length]), seq]);
};
