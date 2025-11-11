export const getChunkSize = (length: number): Buffer => {
    const buffer = Buffer.allocUnsafe(2);
    buffer.writeUInt16BE(length, 0);

    return buffer;
};

export const hexToBuffer = (hex: string): Buffer => Buffer.from(hex, 'hex');

export const numberToBuffer = (num: number): Buffer => {
    const buffer = Buffer.allocUnsafe(4);
    buffer.writeUInt32BE(num, 0);

    return buffer;
};
