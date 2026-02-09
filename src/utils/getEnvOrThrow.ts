export const getEnvOrThrow = (name: string): string => {
    const value = process.env[name];

    if (value === undefined || value === '') {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
};
