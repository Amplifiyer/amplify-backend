import * as path from 'path';
import { AmplifyUserError, TagName } from '@aws-amplify/platform-core';
import {
  AmplifyRestApi,
  AuthConfig,
  EndpointConfig,
  PathConfig,
  RestApiProps as ConstructRestApiProps,
} from '@aws-amplify/rest-api-construct';
import {
  AmplifyResourceGroupName,
  AuthResources,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  GenerateContainerEntryProps,
  ResourceProvider,
  RestApiResources,
  StackProvider,
} from '@aws-amplify/plugin-types';
import { Stack, Tags } from 'aws-cdk-lib';
import { EndpointConfigProps, EndpointIntegrationProps, PathConfigProps, RestApiProps } from './types.js';
import { UserPool } from 'aws-cdk-lib/aws-cognito';

export type BackendRestApi = ResourceProvider<RestApiResources> & StackProvider;

/**
 * Singleton factory for AmplifyRestApi that can be used in Amplify project files.
 */
export class AmplifyRestApiFactory implements ConstructFactory<BackendRestApi> {
  // publicly accessible for testing purpose only.
  static factoryCount = 0;

  readonly provides = 'RestApiResources';

  private generator: ConstructContainerEntryGenerator;

  /**
   * Set the properties that will be used to initialize AmplifyRestApi
   */
  constructor(
    private readonly props: RestApiProps,
    // eslint-disable-next-line @aws-amplify/amplify-backend-rules/prefer-amplify-errors
    private readonly importStack = new Error().stack,
  ) {
    if (AmplifyRestApiFactory.factoryCount > 0) {
      throw new AmplifyUserError('MultipleSingletonResourcesError', {
        message:
          'Multiple `defineRestApi` calls are not allowed within an Amplify backend',
        resolution: 'Remove all but one `defineRestApi` call',
      });
    }
    AmplifyRestApiFactory.factoryCount++;
  }

  /**
   * Get a singleton instance of AmplifyRestApi
   */
  getInstance = (
    getInstanceProps: ConstructFactoryGetInstanceProps,
  ): BackendRestApi => {
    const { constructContainer, importPathVerifier, resourceNameValidator } =
      getInstanceProps;
    importPathVerifier?.verify(
      this.importStack,
      path.join('amplify', 'rest-api', 'resource'),
      'Amplify REST API must be defined in amplify/rest-api/resource.ts',
    );
    if (this.props.name) {
      resourceNameValidator?.validate(this.props.name);
    }
    if (!this.generator) {
      this.generator = new AmplifyRestApiGenerator(this.props, getInstanceProps);
    }
    return constructContainer.getOrCompute(this.generator) as BackendRestApi;
  };
}

class AmplifyRestApiGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName: AmplifyResourceGroupName = 'rest-api';
  private readonly name: string;

  constructor(
    private readonly props: RestApiProps,
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps,
  ) {
    this.name = props.name ?? 'amplifyRestApi';
  }

  generateContainerEntry = ({
    scope,
  }: GenerateContainerEntryProps) => {
    // Get auth resources if available
    let userPool: UserPool | undefined;
    try {
      const authFactory = this.getInstanceProps.constructContainer.getResourceProvider('AuthResources');
      if (authFactory) {
        const authResources = (authFactory as ResourceProvider<AuthResources>).resources;
        userPool = authResources.userPool;
      }
    } catch (error) {
      // Auth is not defined, continue without it
    }

    // Validate groups if specified
    this.validateGroups(userPool);

    // Transform props to construct props
    const constructProps = this.transformProps(this.props);

    // Create the REST API construct
    let restApiConstruct: AmplifyRestApi;
    try {
      restApiConstruct = new AmplifyRestApi(
        scope,
        this.name,
        constructProps,
        userPool,
        this.getInstanceProps.outputStorageStrategy,
      );
    } catch (error) {
      throw new AmplifyUserError(
        'AmplifyRestApiConstructInitializationError',
        {
          message: 'Failed to instantiate REST API construct',
          resolution: 'See the underlying error message for more details.',
        },
        error as Error,
      );
    }

    Tags.of(restApiConstruct).add(TagName.FRIENDLY_NAME, this.name);

    const restApiConstructMixin: BackendRestApi = {
      ...restApiConstruct,
      stack: Stack.of(restApiConstruct),
    };

    return restApiConstructMixin;
  };

  /**
   * Validate that groups specified in auth config exist in the user pool
   */
  private validateGroups(userPool?: UserPool): void {
    // Skip validation if no user pool is available
    if (!userPool) {
      return;
    }

    // Get all groups that need to be validated
    const groupsToValidate = new Set<string>();

    // Check default auth config
    if (this.props.defaultAuthConfig?.groups) {
      this.props.defaultAuthConfig.groups.forEach(group => groupsToValidate.add(group));
    }

    // Check path-specific auth configs
    for (const pathConfig of Object.values(this.props.paths)) {
      for (const endpoint of pathConfig.endpoints) {
        if (endpoint.auth?.groups) {
          endpoint.auth.groups.forEach(group => groupsToValidate.add(group));
        }
      }
    }

    // If no groups to validate, return
    if (groupsToValidate.size === 0) {
      return;
    }

    // Get auth groups
    let authGroups: string[] = [];
    try {
      const authFactory = this.getInstanceProps.constructContainer.getResourceProvider('AuthResources');
      if (authFactory) {
        const authResources = (authFactory as ResourceProvider<AuthResources>).resources;
        authGroups = Object.keys(authResources.groups || {});
      }
    } catch (error) {
      // Auth is not defined or doesn't have groups
    }

    // Validate that all groups exist
    const missingGroups = Array.from(groupsToValidate).filter(group => !authGroups.includes(group));
    if (missingGroups.length > 0) {
      throw new AmplifyUserError('InvalidRestApiGroupsError', {
        message: `The following groups are used in REST API configuration but are not defined in auth: ${missingGroups.join(', ')}`,
        resolution: 'Add these groups to your auth configuration or remove them from your REST API configuration',
      });
    }
  }

  /**
   * Transform backend-rest-api props to rest-api-construct props
   */
  private transformProps(props: RestApiProps): ConstructRestApiProps {
    const paths: Record<string, PathConfig> = {};

    // Transform each path
    for (const [pathKey, pathConfig] of Object.entries(props.paths)) {
      const endpoints: EndpointConfig[] = [];

      // Transform each endpoint
      for (const endpointConfig of pathConfig.endpoints) {
        endpoints.push({
          method: endpointConfig.method,
          auth: endpointConfig.auth,
          integration: this.transformIntegration(endpointConfig.integration),
        });
      }

      paths[pathKey] = {
        endpoints,
      };
    }

    return {
      name: props.name,
      description: props.description,
      paths,
      defaultAuthConfig: props.defaultAuthConfig,
    };
  }

  /**
   * Transform integration props to construct integration
   */
  private transformIntegration(integration: EndpointIntegrationProps) {
    if (integration.function) {
      return {
        function: integration.function.getInstance(this.getInstanceProps).resources.lambda,
      };
    }

    if (integration.mock) {
      return {
        mock: integration.mock,
      };
    }

    return {
      mock: {
        statusCode: '200',
        responseTemplates: {
          'application/json': JSON.stringify({
            message: 'Default mock integration',
          }),
        },
      },
    };
  }
}

/**
 * Define a REST API for your Amplify backend
 */
export const defineRestApi = (
  props: RestApiProps,
): ConstructFactory<BackendRestApi> =>
  // eslint-disable-next-line @aws-amplify/amplify-backend-rules/prefer-amplify-errors
  new AmplifyRestApiFactory(props, new Error().stack);