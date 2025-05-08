import { RestApiOutput } from '@aws-amplify/backend-output-schemas';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import {
  AmplifyResourceGroupName,
  BackendOutputStorageStrategy,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  FunctionResources,
  GenerateContainerEntryProps,
  ResourceProvider,
  StackProvider
} from '@aws-amplify/plugin-types';
import {
  CfnRestApi,
  Cors,
  EndpointType,
  LambdaIntegration,
  MethodLoggingLevel,
  RestApi
} from 'aws-cdk-lib/aws-apigateway';
import { Stack, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * HTTP methods supported by the REST API
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD' | 'ANY';

/**
 * Configuration for a route handler
 */
export type RouteConfig = {
  /**
   * The function to invoke when this route is called
   */
  function: ResourceProvider<FunctionResources>;
};

/**
 * Configuration for routes in the REST API
 */
export type RoutesConfig = {
  [path: string]: {
    [method in HttpMethod]?: RouteConfig;
  };
};

/**
 * Properties for defining a REST API
 */
export type RestApiProps = {
  /**
   * A name for the REST API
   * @default 'api'
   */
  name?: string;

  /**
   * Routes configuration for the REST API
   */
  routes: RoutesConfig;

  /**
   * Enable CORS for the API
   * @default true
   */
  cors?: boolean;

  /**
   * Group the REST API with existing Amplify resources or separate it into its own group
   * @default 'api'
   */
  resourceGroupName?: AmplifyResourceGroupName;
};

/**
 * Resources created by the REST API
 */
export type RestApiResources = {
  /**
   * The REST API construct
   */
  restApi: RestApi;

  /**
   * CloudFormation resources
   */
  cfnResources: {
    /**
     * The CloudFormation REST API resource
     */
    cfnRestApi: CfnRestApi;
  };
};

/**
 * Entry point for defining a REST API in the Amplify ecosystem
 * @param props Configuration for the REST API
 * @returns A construct factory for the REST API
 */
export function defineRestApi(
  props: RestApiProps
): ConstructFactory<ResourceProvider<RestApiResources> & StackProvider> {
  return new RestApiFactory(props);
}

/**
 * Factory for creating REST API resources
 */
class RestApiFactory implements ConstructFactory<AmplifyRestApi> {
  private generator: ConstructContainerEntryGenerator;

  /**
   * Create a new RestApiFactory
   * @param props Configuration for the REST API
   */
  constructor(private readonly props: RestApiProps) {}

  /**
   * Creates an instance of AmplifyRestApi within the provided Amplify context
   */
  getInstance = ({
    constructContainer,
    outputStorageStrategy
  }: ConstructFactoryGetInstanceProps): AmplifyRestApi => {
    if (!this.generator) {
      this.generator = new RestApiGenerator(
        this.hydrateDefaults(),
        outputStorageStrategy,
        constructContainer
      );
    }
    return constructContainer.getOrCompute(this.generator) as AmplifyRestApi;
  };

  /**
   * Hydrate default values for the REST API configuration
   */
  private hydrateDefaults = (): Required<RestApiProps> => {
    return {
      name: this.props.name ?? 'api',
      routes: this.props.routes,
      cors: this.props.cors ?? true,
      resourceGroupName: this.props.resourceGroupName ?? 'api'
    };
  };
}

/**
 * Generator for creating REST API resources
 */
class RestApiGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName: AmplifyResourceGroupName;

  /**
   * Create a new RestApiGenerator
   * @param props Configuration for the REST API
   * @param outputStorageStrategy Strategy for storing outputs
   * @param constructContainer Container for accessing other constructs
   */
  constructor(
    private readonly props: Required<RestApiProps>,
    private readonly outputStorageStrategy: BackendOutputStorageStrategy<RestApiOutput>,
    private readonly constructContainer: ConstructFactoryGetInstanceProps['constructContainer']
  ) {
    this.resourceGroupName = props.resourceGroupName;
  }

  /**
   * Generate the REST API construct
   */
  generateContainerEntry = ({ scope }: GenerateContainerEntryProps) => {
    return new AmplifyRestApi(
      scope,
      this.props.name,
      this.props,
      this.outputStorageStrategy,
      this.constructContainer
    );
  };
}

/**
 * Amplify REST API construct
 */
class AmplifyRestApi implements ResourceProvider<RestApiResources>, StackProvider {
  readonly resources: RestApiResources;
  readonly stack: Stack;

  /**
   * Create a new AmplifyRestApi
   * @param scope The construct scope
   * @param id The construct ID
   * @param props Configuration for the REST API
   * @param outputStorageStrategy Strategy for storing outputs
   * @param constructContainer Container for accessing other constructs
   */
  constructor(
    scope: Construct,
    id: string,
    props: Required<RestApiProps>,
    outputStorageStrategy: BackendOutputStorageStrategy<RestApiOutput>,
    constructContainer: ConstructFactoryGetInstanceProps['constructContainer']
  ) {
    this.stack = Stack.of(scope);

    // Create the REST API
    const restApi = new RestApi(scope, `${id}-rest-api`, {
      restApiName: id,
      description: `Amplify Gen2 REST API: ${id}`,
      endpointTypes: [EndpointType.REGIONAL],
      deployOptions: {
        stageName: 'api',
        metricsEnabled: true,
        loggingLevel: MethodLoggingLevel.INFO,
        tracingEnabled: true
      },
      defaultCorsPreflightOptions: props.cors
        ? {
            allowOrigins: Cors.ALL_ORIGINS,
            allowMethods: Cors.ALL_METHODS,
            allowHeaders: Cors.DEFAULT_HEADERS,
            maxAge: 300
          }
        : undefined
    });

    // Add routes to the API
    this.addRoutes(restApi, props.routes, constructContainer);

    // Store the resources
    this.resources = {
      restApi,
      cfnResources: {
        cfnRestApi: restApi.node.findChild('Resource') as CfnRestApi
      }
    };

    // Add tags
    Tags.of(restApi).add('amplify:generated', 'true');
    Tags.of(restApi).add('amplify:resource-type', 'api');

    // Store outputs
    this.storeOutput(outputStorageStrategy, restApi);
  }

  /**
   * Add routes to the REST API
   * @param restApi The REST API construct
   * @param routes The routes configuration
   * @param constructContainer Container for accessing other constructs
   */
  private addRoutes(
    restApi: RestApi,
    routes: RoutesConfig,
    constructContainer: ConstructFactoryGetInstanceProps['constructContainer']
  ) {
    // Process each route path
    for (const [path, methods] of Object.entries(routes)) {
      // Create the resource path
      const resource = this.createResourcePath(restApi, path);

      // Add methods to the resource
      for (const [method, config] of Object.entries(methods)) {
        try {
          // Get the function resources
          const functionProvider = config.function;
          const functionResources = functionProvider.resources;

          // Create the integration
          const integration = new LambdaIntegration(functionResources.lambda);

          // Add the method to the resource
          resource.addMethod(method, integration);
        } catch (error) {
          throw new AmplifyUserError('RestApiMethodConfigurationError', {
            message: `Failed to configure method ${method} for path ${path}`,
            resolution: 'Ensure the function reference is valid and accessible.',
          }, error as Error);
        }
      }
    }
  }

  /**
   * Create a resource path in the REST API
   * @param restApi The REST API construct
   * @param path The path to create
   * @returns The created resource
   */
  private createResourcePath(restApi: RestApi, path: string) {
    // Remove leading slash if present
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;

    // If path is empty or just '/', return the root resource
    if (!normalizedPath || normalizedPath === '/') {
      return restApi.root;
    }

    // Split the path into segments
    const segments = normalizedPath.split('/');
    
    // Start with the root resource
    let resource = restApi.root;
    
    // Create each segment of the path
    for (const segment of segments) {
      // Check if the segment is a path parameter
      if (segment.startsWith('{') && segment.endsWith('}')) {
        // Path parameter
        const paramName = segment.substring(1, segment.length - 1);
        resource = resource.addResource(`{${paramName}}`);
      } else {
        // Regular path segment
        resource = resource.addResource(segment);
      }
    }
    
    return resource;
  }

  /**
   * Store the REST API outputs
   * @param outputStorageStrategy Strategy for storing outputs
   * @param restApi The REST API construct
   */
  private storeOutput(
    outputStorageStrategy: BackendOutputStorageStrategy<RestApiOutput>,
    restApi: RestApi
  ) {
    outputStorageStrategy.store({
      version: '1',
      payload: {
        restApiId: restApi.restApiId,
        restApiEndpoint: restApi.url,
        region: Stack.of(restApi).region
      }
    });
  }
}