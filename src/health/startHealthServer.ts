import fastify from 'fastify';

type HealthStatus = 'ok' | 'error' | 'pending' | 'exiting';

type HealthState = {
    relay: HealthStatus;
    quotaManager: HealthStatus;
};

type StartHealthServerDependencies = {
    port: number;
};

export type UpdateHealth = (updates: Partial<HealthState>) => void;
export type UpdateHealthDep = { updateHealth: UpdateHealth };

/**
 * Starts a health server that provides health status of different components.
 * @returns updateHealth callback to update health status
 */
export const startHealthServer = ({ port }: StartHealthServerDependencies): UpdateHealth => {
    const server = fastify();

    const healthState: HealthState = {
        relay: 'pending',
        quotaManager: 'pending',
    };

    const updateHealth = (updates: Partial<HealthState>) => {
        Object.assign(healthState, updates);
    };

    server.get('/', () => healthState);

    server.listen({ port, host: '0.0.0.0' }, (err, address) => {
        if (err) {
            console.error('Health server failed to start:', err);
            process.exit(1);
        }

        // eslint-disable-next-line no-console
        console.log(`Health server listening at ${address}`);
    });

    function dispose() {
        // eslint-disable-next-line no-console
        console.log('Health server is shutting down ...');
        server.close();
    }

    process.on('SIGINT', dispose);
    process.on('SIGTERM', dispose);

    return updateHealth;
};
