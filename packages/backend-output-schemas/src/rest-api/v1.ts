import { z } from 'zod';

/**
 * Schema for REST API output
 */
export const restApiOutputSchemaV1 = z.object({
  restApiId: z.string(),
  restApiEndpoint: z.string(),
  restApiName: z.string(),
  routes: z.array(
    z.object({
      path: z.string(),
      methods: z.array(z.string()),
      requiresAuth: z.boolean().optional()
    })
  )
});

export type RestApiOutputV1 = z.infer<typeof restApiOutputSchemaV1>;