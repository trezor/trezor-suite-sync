export const getOptionalEnvInt = (name: string, defaultValue: number): number => {
    const value = process.env[name];

    if (value === undefined || value === '') {
        return defaultValue;
    }

    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
        throw new Error(
            `Invalid integer value for optional environment variable ${name}: "${value}"`,
        );
    }

    return parsed;
};
