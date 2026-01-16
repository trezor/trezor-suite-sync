import { FastifyServerDep } from './createFastifyServer.js';
import { UpdateHealthDep } from '../health/createHealthServer.js';

export type QuotaManagerServerDeps = FastifyServerDep & UpdateHealthDep;

export type QuotaManagerServer = (params: { port: number }) => Promise<void>;

export type QuotaManagerServerDep = { quotaManagerServer: QuotaManagerServer };

export const createQuotaManagerServer =
    (deps: QuotaManagerServerDeps): QuotaManagerServer =>
    async ({ port }) => {
        try {
            const address = await deps.fastifyServer.listen({ port, host: '0.0.0.0' });

            deps.updateHealth({ quotaManager: 'ok' });
            // eslint-disable-next-line no-console
            console.log(`Payment Server (Quota Manager) started on ${address}`);
        } catch (err) {
            console.error('Failed to start Payment Server (Quota Manager):', err);

            deps.updateHealth({ quotaManager: 'error' });
        }

        const close = () => {
            // eslint-disable-next-line no-console
            console.log('Payment Server (Quota Manager) is shutting down...');
            deps.updateHealth({ quotaManager: 'exiting' });
            deps.fastifyServer.close();
        };

        process.on('SIGINT', close);
        process.on('SIGTERM', close);
    };
