export const getChunkSize = (length: number): Buffer => {
    const buf = Buffer.allocUnsafe(1);
    buf.writeUInt8(length);

    return buf;
};

export const hexToBuffer = (hex: string): Buffer => Buffer.from(hex, 'hex');

export const numberToBuffer = (num: number): Buffer => {
    const buffer = Buffer.allocUnsafe(4);

    buffer.writeUInt32BE(num, 0);

    return buffer;
};
