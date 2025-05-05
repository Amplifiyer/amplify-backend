import { AmplifyFunction } from '@aws-amplify/backend-function';
import { ConstructFactory } from '@aws-amplify/plugin-types';
import { StoragePath } from './types.js';

/**
 * Properties for configuring a Lambda authorizer for storage operations
 */
export type LambdaStorageAuthorizerProps = {
  /**
   * The function that will be used to handle authorization for storage operations.
   * This function will be invoked at runtime to authorize storage access.
   */
  function: ConstructFactory<AmplifyFunction>;

  /**
   * Optional list of storage paths this authorizer applies to.
   * If not specified, the authorizer applies to all storage paths.
   */
  paths?: StoragePath[];
};