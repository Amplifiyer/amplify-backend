import { z } from 'zod';
import { restApiOutputSchemaV1, RestApiOutputV1 } from './v1.js';

/**
 * Schema for versioned REST API output
 */
export const versionedRestApiOutputSchema = z.discriminatedUnion('version', [
  z.object({
    version: z.literal('1'),
    payload: restApiOutputSchemaV1
  })
]);

export type VersionedRestApiOutput = z.infer<typeof versionedRestApiOutputSchema>;

export type RestApiOutput = RestApiOutputV1;

export * from './v1.js';