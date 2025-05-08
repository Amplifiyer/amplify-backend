import { z } from 'zod';

/**
 * Schema for REST API output version 1
 */
export const restApiOutputSchemaV1 = z.object({
  version: z.literal('1'),
  payload: z.object({
    restApiId: z.string(),
    restApiEndpoint: z.string(),
    region: z.string()
  })
});

/**
 * Type for REST API output version 1
 */
export type RestApiOutputV1 = z.infer<typeof restApiOutputSchemaV1>;