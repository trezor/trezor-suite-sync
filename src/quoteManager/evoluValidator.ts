import type { AnyType } from '@evolu/common';
import type { FastifySchemaCompiler } from 'fastify';

type SchemaWithEvolu = {
    evoluSchema?: AnyType;
};

export const evoluValidatorCompiler: FastifySchemaCompiler<SchemaWithEvolu> = ({ schema }) => {
    if (schema && typeof schema === 'object' && 'evoluSchema' in schema) {
        const { evoluSchema } = schema;

        // fallback for no evolu schema
        if (!evoluSchema) {
            return (data: unknown) => ({ value: data });
        }

        return (data: unknown) => {
            const result = evoluSchema.from(data);

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
