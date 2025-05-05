/**
 * This file contains utilities for integrating the custom storage authorizer with the Amplify Storage client.
 * It provides the glue between the CDK construct and the runtime client implementation.
 */

import { CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StoragePath } from './types.js';

/**
 * Output names used for CloudFormation outputs that will be consumed by the Storage client
 */
export const STORAGE_AUTH_CONFIG_OUTPUT_KEY = 'StorageAuthConfig';

/**
 * Structure of the output that will be consumed by the client to enable custom authorization
 */
export interface StorageAuthConfig {
  /**
   * ARN of the custom authorizer lambda function
   */
  authorizerFunctionArn: string;
  
  /**
   * Optional list of paths that the authorizer applies to
   */
  authorizerPaths?: StoragePath[];
  
  /**
   * ID of the storage resource this authorizer is for
   */
  storageId: string;
}

/**
 * Adds CloudFormation outputs for the Storage authorizer configuration
 * so that the client implementation can use them
 */
export function addStorageAuthorizerOutputs(
  scope: Construct,
  authConfig: StorageAuthConfig
): void {
  const outputId = `${authConfig.storageId}AuthConfig`;
  
  // Create a CloudFormation output with the authorizer configuration
  new CfnOutput(scope, outputId, {
    value: JSON.stringify(authConfig),
    exportName: `${authConfig.storageId}-${STORAGE_AUTH_CONFIG_OUTPUT_KEY}`,
  });
}