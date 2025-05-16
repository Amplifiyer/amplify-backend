import { AmplifyClient, GetAppCommand } from '@aws-sdk/client-amplify';
import { AmplifyUserError } from '@aws-amplify/platform-core';

/**
 * Validates if an Amplify App ID exists in the configured AWS account and region
 */
export class AppIdValidator {
  /**
   * Initialize with an Amplify client
   */
  constructor(private readonly amplifyClient: AmplifyClient) {}

  /**
   * Validates if the provided appId exists in the Amplify service
   * @param appId The Amplify App ID to validate
   * @throws AmplifyUserError if the appId doesn't exist
   */
  validateAppId = async (appId: string): Promise<void> => {
    try {
      await this.amplifyClient.send(new GetAppCommand({ appId }));
    } catch (error) {
      // Check if the error is because the app doesn't exist
      if (
        error instanceof Error &&
        (error.name === 'NotFoundException' || 
         error.message.includes('App not found'))
      ) {
        const region = await this.amplifyClient.config.region();
        throw new AmplifyUserError('InvalidAppIdError', {
          message: `The Amplify App ID '${appId}' does not exist in the configured region '${region}'`,
          resolution: 'Please verify the App ID and ensure it exists in the configured AWS region',
        });
      }
      // Re-throw other errors
      throw error;
    }
  };
}