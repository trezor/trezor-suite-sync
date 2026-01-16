import fastify from 'fastify';

type HealthStatus = 'ok' | 'error' | 'pending' | 'exiting';

type HealthState = {
    relay: HealthStatus;
    quotaManager: HealthStatus;
};

type HealthServerParams = {
    port: number;
};

export type HealthServer = {
    start: (paras: HealthServerParams) => void;
    updateHealth: (updates: Partial<HealthState>) => void;
};

export type HealthServerDep = { healthServer: HealthServer };
export type UpdateHealthDep = { updateHealth: HealthServer['updateHealth'] };

export const createHealthServer = (): HealthServer => {
    const healthState: HealthState = {
        relay: 'pending',
        quotaManager: 'pending',
    };

    const updateHealth = (updates: Partial<HealthState>) => {
        Object.assign(healthState, updates);
    };

    const start = ({ port }: HealthServerParams) => {
        const server = fastify();

        server.get('/', () => healthState);

        function dispose() {
            // eslint-disable-next-line no-console
            console.log('Health server is shutting down ...');
            server.close();
        }

        process.on('SIGINT', dispose);
        process.on('SIGTERM', dispose);

        server.listen({ port, host: '0.0.0.0' }, (err, address) => {
            if (err) {
                console.error('Health server failed to start:', err);
                process.exit(1);
            }

            // eslint-disable-next-line no-console
            console.log(`Health server listening at ${address}`);
        });
    };

    return { start, updateHealth };
};
