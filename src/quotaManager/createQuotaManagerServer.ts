import { FastifyServerDep } from './createFastifyServer.js';
import { UpdateHealthDep } from '../health/startHealthServer.js';

export type StartQuotaManagerServerDeps = FastifyServerDep & UpdateHealthDep;

export type StartQuotaManagerServer = (params: { port: number }) => Promise<boolean>;

export type StartQuotaManagerServerDep = { startQuotaManagerServer: StartQuotaManagerServer };

export const createQuotaManagerServer =
    (deps: StartQuotaManagerServerDeps): StartQuotaManagerServer =>
    async ({ port }) => {
        try {
            const address = await deps.fastifyServer.listen({ port, host: '0.0.0.0' });

            deps.updateHealth({ quotaManager: 'ok' });
            // eslint-disable-next-line no-console
            console.log(`Payment Server (Quota Manager) started on ${address}`);
        } catch (err) {
            console.error('Failed to start Payment Server (Quota Manager):', err);

            deps.updateHealth({ quotaManager: 'error' });

            return false;
        }

        const close = () => {
            // eslint-disable-next-line no-console
            console.log('Payment Server (Quota Manager) is shutting down...');
            deps.updateHealth({ quotaManager: 'exiting' });
            deps.fastifyServer.close();
        };

        process.on('SIGINT', close);
        process.on('SIGTERM', close);

        return true;
    };
