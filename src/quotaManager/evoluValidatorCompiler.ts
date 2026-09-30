import type { AnyType } from '@evolu/common';
import type { FastifySchemaCompiler } from 'fastify';

type SchemaWithEvolu = {
    evoluSchema?: AnyType;
};

/**
 * Explicit shape of a route's request schema. Evolu object Types reference internal
 * types that TypeScript cannot name in declaration output, so the shape must be declared.
 */
export type EvoluRequestSchema<T extends AnyType> = {
    readonly schema: {
        readonly body: {
            readonly evoluSchema: T;
        };
    };
};

export const evoluValidatorCompiler: FastifySchemaCompiler<SchemaWithEvolu> = ({ schema }) => {
    if (schema && typeof schema === 'object' && 'evoluSchema' in schema) {
        const { evoluSchema } = schema;

        // fallback for no evolu schema
        if (!evoluSchema) {
            return (data: unknown) => ({ value: data });
        }

        return (data: unknown) => {
            const result = evoluSchema.fromUnknown(data);

            if (!result.ok) {
                return {
                    error: new Error(JSON.stringify(result.error)),
                };
            }

            return { value: result.value };
        };
    }

    return (data: unknown) => ({ value: data });
};
