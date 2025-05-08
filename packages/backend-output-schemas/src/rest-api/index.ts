import { z } from 'zod';
import { versionedSchema } from '../versioned_schema.js';

/**
 * Schema for REST API outputs
 */
export const restApiOutputSchema = z.object({
  restApiUrl: z.string(),
  restApiId: z.string(),
  restApiRootResourceId: z.string(),
});

/**
 * Type for REST API outputs
 */
export type RestApiOutput = z.infer<typeof restApiOutputSchema>;

/**
 * Versioned schema for REST API outputs
 */
export const versionedRestApiOutputSchema = versionedSchema(restApiOutputSchema);

/**
 * Type for versioned REST API outputs
 */
export type VersionedRestApiOutput = z.infer<typeof versionedRestApiOutputSchema>;