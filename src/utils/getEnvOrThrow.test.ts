import { describe, expect, it } from 'vitest';

import { getEnvOrThrow } from './getEnvOrThrow.js';

describe(getEnvOrThrow.name, () => {
    it('should throw an error if the environment variable is missing', () => {
        expect(() => getEnvOrThrow('MISSING_VAR')).toThrowError(
            'Missing required environment variable: MISSING_VAR',
        );
    });

    it('should return the value of the environment variable if it exists', () => {
        process.env.EXISTING_VAR = 'test';

        expect(getEnvOrThrow('EXISTING_VAR')).toBe('test');
    });
});
