import * as path from 'path';
import { Stack, Tags } from 'aws-cdk-lib';
import { AmplifyUserError, TagName } from '@aws-amplify/platform-core';
import {
  AmplifyResourceGroupName,
  AuthResources,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  GenerateContainerEntryProps,
  ResourceProvider,
  StackProvider,
} from '@aws-amplify/plugin-types';
import { AmplifyRestApi, AmplifyRestApiProps, RestApiResources } from './construct.js';
import { AmplifyRestApiFactoryProps } from './types.js';
import { RestApiOutput } from '@aws-amplify/backend-output-schemas';

/**
 * Type for the REST API resource provider
 */
export type BackendRestApi = ResourceProvider<RestApiResources> & StackProvider;

/**
 * Factory for creating REST API resources
 */
export class AmplifyRestApiFactory implements ConstructFactory<BackendRestApi> {
  readonly provides = 'RestApiResources';
  private generator: ConstructContainerEntryGenerator;

  /**
   * Create a new AmplifyRestApiFactory
   */
  constructor(
    private readonly props: AmplifyRestApiFactoryProps,
    private readonly importStack = new Error().stack,
  ) {}

  /**
   * Get an instance of the REST API
   */
  getInstance = (
    getInstanceProps: ConstructFactoryGetInstanceProps,
  ): BackendRestApi => {
    const { constructContainer, importPathVerifier, resourceNameValidator } =
      getInstanceProps;
    
    // Verify that the REST API is defined in the correct file
    importPathVerifier?.verify(
      this.importStack,
      path.join('amplify', 'api', 'resource'),
      'Amplify REST API must be defined in amplify/api/resource.ts',
    );
    
    // Validate the resource name
    if (this.props.name) {
      resourceNameValidator?.validate(this.props.name);
    }
    
    // Create the generator if it doesn't exist
    if (!this.generator) {
      this.generator = new RestApiGenerator(this.props, getInstanceProps);
    }
    
    // Get or compute the REST API
    const restApi = constructContainer.getOrCompute(this.generator) as BackendRestApi;
    
    return restApi;
  };
}

/**
 * Generator for creating REST API resources
 */
class RestApiGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName: AmplifyResourceGroupName = 'api';

  /**
   * Create a new RestApiGenerator
   */
  constructor(
    private readonly props: AmplifyRestApiFactoryProps,
    private readonly getInstanceProps: ConstructFactoryGetInstanceProps,
  ) {}

  /**
   * Generate the container entry for the REST API
   */
  generateContainerEntry = ({
    scope,
  }: GenerateContainerEntryProps): BackendRestApi => {
    // Try to get auth resources if they exist
    let authResources: AuthResources | undefined;
    try {
      const authFactory = this.getInstanceProps.constructContainer.getResourceProvider('AuthResources');
      if (authFactory) {
        authResources = (authFactory.getInstance(this.getInstanceProps) as ResourceProvider<AuthResources>).resources;
      }
    } catch (error) {
      // Auth is not required, so we can ignore this error
    }

    // Create the REST API props
    const restApiProps: AmplifyRestApiProps = {
      ...this.props,
      outputStorageStrategy: this.getInstanceProps.outputStorageStrategy,
      authResources,
    };

    // Create the REST API
    let restApiConstruct: AmplifyRestApi;
    try {
      restApiConstruct = new AmplifyRestApi(scope, this.props.name, restApiProps);
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

    // Add tags to the REST API
    Tags.of(restApiConstruct).add(TagName.FRIENDLY_NAME, this.props.name);

    // Return the REST API with stack information
    return {
      resources: restApiConstruct.resources,
      stack: Stack.of(restApiConstruct),
    };
  };
}

/**
 * Define a REST API for your Amplify backend
 * @param props Configuration for the REST API
 * @returns A construct factory for the REST API
 */
export const defineRestApi = (
  props: AmplifyRestApiFactoryProps,
): ConstructFactory<BackendRestApi> =>
  new AmplifyRestApiFactory(props, new Error().stack);