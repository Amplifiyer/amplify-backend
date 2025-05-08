import { z } from 'zod';

/**
 * Key for REST API output in client config
 */
export const restApiOutputKey = 'restApi';

/**
 * Schema for REST API output
 */
export const restApiOutputSchema = z.object({
  restApiId: z.string(),
  restApiEndpoint: z.string(),
  region: z.string(),
});

/**
 * Type for REST API output
 */
export type RestApiOutput = z.infer<typeof restApiOutputSchema>;