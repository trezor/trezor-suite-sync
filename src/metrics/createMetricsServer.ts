import { FastifyInstance } from 'fastify';

export type MetricsServerDeps = { metricsFastifyServer: FastifyInstance };

export type MetricsServer = (params: { port: number }) => Promise<void>;

export type MetricsServerDep = { metricsServer: MetricsServer };

export const createMetricsServer =
    (deps: MetricsServerDeps): MetricsServer =>
    async ({ port }) => {
        try {
            const address = await deps.metricsFastifyServer.listen({ port, host: '0.0.0.0' });

            // eslint-disable-next-line no-console
            console.log(`Metrics server started on ${address}`);
        } catch (err) {
            console.error('Failed to start Metrics server:', err);
        }

        const close = () => {
            // eslint-disable-next-line no-console
            console.log('Metrics server is shutting down...');
            deps.metricsFastifyServer.close();
        };

        process.on('SIGINT', close);
        process.on('SIGTERM', close);
    };
