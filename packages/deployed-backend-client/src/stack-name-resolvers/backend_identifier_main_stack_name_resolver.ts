import {
  BackendIdentifier,
  MainStackNameResolver,
} from '@aws-amplify/plugin-types';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';
import { AmplifyClient, GetAppCommand, ResourceNotFoundException } from '@aws-sdk/client-amplify';
import { BackendOutputClientError, BackendOutputClientErrorType } from '../backend_output_client_factory.js';

/**
 * Resolves the main stack name for a given project environment
 */
export class BackendIdentifierMainStackNameResolver
  implements MainStackNameResolver
{
  /**
   * Initialize with the project environment identifier and an AmplifyClient
   */
  constructor(
    private readonly backendId: BackendIdentifier,
    private readonly amplifyClient?: AmplifyClient
  ) {}

  /**
   * Resolve the stack name for this project environment
   */
  resolveMainStackName = async (): Promise<string> => {
    // If the backendId has a namespace (which is the appId for branch type), validate it exists
    if (this.backendId.type === 'branch' && this.amplifyClient) {
      try {
        await this.amplifyClient.send(
          new GetAppCommand({ appId: this.backendId.namespace })
        );
      } catch (error) {
        if (error instanceof ResourceNotFoundException) {
          const region = await this.amplifyClient.config.region();
          throw new BackendOutputClientError(
            BackendOutputClientErrorType.INVALID_APP_ID,
            `App with ID '${this.backendId.namespace}' does not exist in region ${region}. Please check the App ID and region configuration.`
          );
        }
        throw error;
      }
    }
    
    return BackendIdentifierConversions.toStackName(this.backendId);
  };
}
