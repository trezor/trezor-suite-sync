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
    start: (params: HealthServerParams) => Promise<AsyncDisposable>;
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

    const start = async ({ port }: HealthServerParams): Promise<AsyncDisposable> => {
        const server = fastify();

        server.get('/', () => healthState);

        const address = await server.listen({ port, host: '0.0.0.0' });
        // eslint-disable-next-line no-console
        console.log(`Health server listening at ${address}`);

        return {
            [Symbol.asyncDispose]: async () => {
                // eslint-disable-next-line no-console
                console.log('Health server is shutting down ...');
                await server.close();
            },
        };
    };

    return { start, updateHealth };
};
