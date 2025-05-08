import { z } from 'zod';
import { restApiOutputSchemaV1, RestApiOutputV1 } from './v1.js';

/**
 * Schema for versioned REST API output
 */
export const versionedRestApiOutputSchema = z.discriminatedUnion('version', [
  restApiOutputSchemaV1
]);

/**
 * Type for versioned REST API output
 */
export type RestApiOutput = RestApiOutputV1;

export * from './v1.js';