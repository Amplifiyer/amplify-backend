import { ClientConfig } from '../client_config.js';
import { restApiOutputKey, VersionedRestApiOutput } from '@aws-amplify/backend-output-schemas';
import { BackendOutput } from '@aws-amplify/plugin-types';
import { ClientConfigAdapter } from './client_config_adapter.js';

/**
 * Adapter for REST API output
 */
export class RestApiAdapter implements ClientConfigAdapter {
  /**
   * Convert REST API output to client config
   */
  adaptToClientConfig(
    backendOutput: BackendOutput,
    clientConfig: ClientConfig
  ): void {
    const restApiOutput = backendOutput[restApiOutputKey] as
      | VersionedRestApiOutput
      | undefined;

    if (!restApiOutput) {
      return;
    }

    if (restApiOutput.version === '1') {
      const { restApiEndpoint, restApiId, routes } = restApiOutput.payload;

      // Add REST API config to client config
      if (!clientConfig.api) {
        clientConfig.api = {};
      }

      clientConfig.api.REST = {
        endpoint: restApiEndpoint,
        region: backendOutput.region,
      };
    }
  }
}