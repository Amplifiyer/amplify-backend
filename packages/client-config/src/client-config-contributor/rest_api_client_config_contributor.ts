import { BackendOutput } from '@aws-amplify/plugin-types';
import { ClientConfigContributor } from '../client-config-types/client_config_contributor.js';
import { ClientConfig } from '../client-config-types/client_config.js';
import { RestApiAdapter } from '../adapter/rest_api_adapter.js';

/**
 * Contributor for REST API client config
 */
export class RestApiClientConfigContributor implements ClientConfigContributor {
  private readonly restApiAdapter = new RestApiAdapter();

  /**
   * Contribute REST API config to client config
   */
  async contribute(backendOutput: BackendOutput): Promise<Partial<ClientConfig>> {
    const clientConfig: Partial<ClientConfig> = {};
    this.restApiAdapter.adaptToClientConfig(backendOutput, clientConfig as ClientConfig);
    return clientConfig;
  }
}