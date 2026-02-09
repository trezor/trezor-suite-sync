import { describe, expect, it } from 'vitest';

import { getOptionalEnvInt } from './getOptionalEnvInt.js';

describe(getOptionalEnvInt.name, () => {
    it('should return undefined if the environment variable is missing', () => {
        expect(getOptionalEnvInt('MISSING_VAR', 4000)).toBe(4000);
    });

    it('should return the parsed integer if the environment variable is present', () => {
        process.env.PRESENT_VAR = '42';

        expect(getOptionalEnvInt('PRESENT_VAR', 50)).toBe(42);
    });

    it('should throw an error if the environment variable is not a valid integer', () => {
        process.env.INVALID_VAR = 'not an integer';

        expect(() => getOptionalEnvInt('INVALID_VAR', 500)).toThrowError(
            'Invalid integer value for optional environment variable INVALID_VAR',
        );
    });
});
