import { describe, expect, it } from 'vitest';

import { getChunkSize, hexToBuffer, numberToBuffer } from './utils.js';

describe('getChunkSize', () => {
    it('converts 0 to 2-byte big-endian buffer', () => {
        const result = getChunkSize(0);
        expect(result).toBeInstanceOf(Buffer);
        expect(result.length).toBe(2);
        expect(result.readUInt16BE(0)).toBe(0);
    });

    it('converts small number to 2-byte big-endian buffer', () => {
        const result = getChunkSize(42);
        expect(result).toBeInstanceOf(Buffer);
        expect(result.length).toBe(2);
        expect(result.readUInt16BE(0)).toBe(42);
    });

    it('converts maximum uint16 value to 2-byte big-endian buffer', () => {
        const result = getChunkSize(65535);
        expect(result).toBeInstanceOf(Buffer);
        expect(result.length).toBe(2);
        expect(result.readUInt16BE(0)).toBe(65535);
    });
});

describe('hexToBuffer', () => {
    it('converts empty hex string to empty buffer', () => {
        const result = hexToBuffer('');
        expect(result).toBeInstanceOf(Buffer);
        expect(result.length).toBe(0);
    });

    it('converts single byte hex string to buffer', () => {
        const result = hexToBuffer('ff');
        expect(result).toBeInstanceOf(Buffer);
        expect(result.length).toBe(1);
        expect(result[0]).toBe(255);
    });

    it('converts multi-byte hex string to buffer', () => {
        const result = hexToBuffer('deadbeef');
        expect(result).toBeInstanceOf(Buffer);
        expect(result.length).toBe(4);
        expect(result.toString('hex')).toBe('deadbeef');
    });

    it('converts hex string with uppercase letters', () => {
        const result = hexToBuffer('DEADBEEF');
        expect(result).toBeInstanceOf(Buffer);
        expect(result.length).toBe(4);
        expect(result.toString('hex')).toBe('deadbeef');
    });

    it('converts hex string with mixed case', () => {
        const result = hexToBuffer('DeAdBeEf');
        expect(result).toBeInstanceOf(Buffer);
        expect(result.length).toBe(4);
        expect(result.toString('hex')).toBe('deadbeef');
    });
});

describe('numberToBuffer', () => {
    it('converts 0 to 4-byte big-endian buffer', () => {
        const result = numberToBuffer(0);
        expect(result).toBeInstanceOf(Buffer);
        expect(result.length).toBe(4);
        expect(result.readUInt32BE(0)).toBe(0);
    });

    it('converts small number to 4-byte big-endian buffer', () => {
        const result = numberToBuffer(42);
        expect(result).toBeInstanceOf(Buffer);
        expect(result.length).toBe(4);
        expect(result.readUInt32BE(0)).toBe(42);
    });

    it('converts large number to 4-byte big-endian buffer', () => {
        const result = numberToBuffer(1000000);
        expect(result).toBeInstanceOf(Buffer);
        expect(result.length).toBe(4);
        expect(result.readUInt32BE(0)).toBe(1000000);
    });

    it('converts maximum uint32 value to 4-byte big-endian buffer', () => {
        const result = numberToBuffer(4294967295);
        expect(result).toBeInstanceOf(Buffer);
        expect(result.length).toBe(4);
        expect(result.readUInt32BE(0)).toBe(4294967295);
    });
});
