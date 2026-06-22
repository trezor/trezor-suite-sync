import { getEnvOrThrow } from './utils/getEnvOrThrow.js';
import { getOptionalEnvInt } from './utils/getOptionalEnvInt.js';

export const config = {
    postgres: {
        user: getEnvOrThrow('POSTGRES_GATE_USER'),
        host: getEnvOrThrow('POSTGRES_GATE_HOST'),
        port: parseInt(getEnvOrThrow('POSTGRES_GATE_PORT'), 10),
        db: getEnvOrThrow('POSTGRES_GATE_DB'),
        password: getEnvOrThrow('POSTGRES_GATE_PASSWORD'),
        ssl: process.env.POSTGRES_GATE_SSL === 'true',
    },
    relay: {
        port: getOptionalEnvInt('RELAY_PORT', 4000),
    },
    quotaManager: {
        port: getOptionalEnvInt('QUOTA_MANAGER_PORT', 4001),
    },
    metrics: {
        port: getOptionalEnvInt('METRICS_PORT', 4003),
    },
    health: {
        port: getOptionalEnvInt('HEALTH_PORT', 4002),
    },
    server: {
        env: getEnvOrThrow('SERVER_ENV') as 'dev' | 'prod',
        isDevServer: process.env.SERVER_ENV === 'dev',
    },
    dataDir: process.env.DATA_DIR || 'data',
};
