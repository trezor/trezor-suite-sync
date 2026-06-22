import { EndpointHandler } from '../../EndpointHandler.js';
import { exhaustive } from '../../exhaustive.js';
import { MetricsOperationDep } from '../createMetricsOperation.js';

export type MetricsHandlerDeps = MetricsOperationDep;

export type MetricsHandler = EndpointHandler<Record<string, never>>;

export const createMetricsHandler =
    (deps: MetricsHandlerDeps): MetricsHandler =>
    async (_request, reply) => {
        const result = await deps.metricsOperation();

        if (!result.ok) {
            const { type } = result.error;

            switch (type) {
                case 'DatabaseError':
                    console.error(result.error);

                    return reply.code(500).send({ error: 'Internal server error' });

                default:
                    return exhaustive(type);
            }
        }

        return reply.type(result.value.contentType).code(200).send(result.value.body);
    };
