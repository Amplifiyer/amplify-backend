import {
  AmplifyUserError,
  CallerDirectoryExtractor,
  TagName,
} from '@aws-amplify/platform-core';
import {
  AmplifyResourceGroupName,
  BackendOutputStorageStrategy,
  BackendSecretResolver,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  GenerateContainerEntryProps,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { RestApiOutput, restApiOutputKey } from '@aws-amplify/backend-output-schemas';
import { Construct } from 'constructs';
import { Stack, Tags } from 'aws-cdk-lib';
import {
  AuthorizationType,
  CfnAuthorizer,
  CognitoUserPoolsAuthorizer,
  Cors,
  IRestApi,
  LambdaIntegration,
  Method,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { HttpMethod, RestApiProps, RestApiResources, RestApiRoute } from './types.js';

/**
 * Define a REST API in the Amplify ecosystem
 * @param props - Configuration for the REST API
 */
export function defineRestApi(
  props: RestApiProps
): ConstructFactory<ResourceProvider<RestApiResources>> {
  return new RestApiFactory(props, new Error().stack);
}

/**
 * Factory for creating REST API constructs
 */
class RestApiFactory implements ConstructFactory<ResourceProvider<RestApiResources>> {
  private generator: ConstructContainerEntryGenerator;

  /**
   * Create a new RestApiFactory
   */
  constructor(
    private readonly props: RestApiProps,
    private readonly callerStack?: string
  ) {}

  /**
   * Creates an instance of AmplifyRestApi within the provided Amplify context
   */
  getInstance = ({
    constructContainer,
    outputStorageStrategy,
  }: ConstructFactoryGetInstanceProps): ResourceProvider<RestApiResources> => {
    if (!this.generator) {
      this.generator = new RestApiGenerator(
        this.hydrateDefaults(),
        outputStorageStrategy
      );
    }
    return constructContainer.getOrCompute(this.generator) as ResourceProvider<RestApiResources>;
  };

  /**
   * Hydrate default values for REST API properties
   */
  private hydrateDefaults = (): Required<RestApiProps> => {
    const name = this.props.name || 'api';
    
    // Validate routes
    if (!this.props.routes || this.props.routes.length === 0) {
      throw new AmplifyUserError('InvalidRestApiConfigError', {
        message: 'REST API must have at least one route defined',
        resolution: 'Add at least one route to the routes array',
      });
    }

    return {
      name,
      routes: this.props.routes,
      auth: this.props.auth || { authenticatedRoutes: [] },
    };
  };
}

/**
 * Generator for REST API constructs
 */
class RestApiGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName: AmplifyResourceGroupName = 'api';

  constructor(
    private readonly props: Required<RestApiProps>,
    private readonly outputStorageStrategy: BackendOutputStorageStrategy<RestApiOutput>
  ) {}

  /**
   * Generate the REST API construct
   */
  generateContainerEntry = ({
    scope,
    constructContainer,
    backendSecretResolver,
  }: GenerateContainerEntryProps) => {
    return new AmplifyRestApi(
      scope,
      this.props.name,
      this.props,
      constructContainer,
      backendSecretResolver,
      this.outputStorageStrategy
    );
  };
}

/**
 * Amplify REST API construct
 */
class AmplifyRestApi implements ResourceProvider<RestApiResources> {
  readonly resources: RestApiResources;
  
  constructor(
    scope: Construct,
    id: string,
    props: Required<RestApiProps>,
    constructContainer: any,
    backendSecretResolver: BackendSecretResolver,
    outputStorageStrategy: BackendOutputStorageStrategy<RestApiOutput>
  ) {
    // Create the REST API
    const api = new RestApi(scope, `${id}-rest-api`, {
      restApiName: props.name,
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: Cors.DEFAULT_HEADERS,
        allowCredentials: true,
      },
    });
    
    Tags.of(api).add(TagName.FRIENDLY_NAME, id);
    
    // Track routes and methods for output
    const routes: Record<string, Method[]> = {};
    const routeConfigs: { path: string; methods: string[]; requiresAuth: boolean }[] = [];
    
    // Set up authentication if needed
    let authorizer: CognitoUserPoolsAuthorizer | undefined;
    let userPool: IUserPool | undefined;
    
    if (props.auth?.authenticatedRoutes && props.auth.authenticatedRoutes.length > 0) {
      try {
        // Try to get auth resources from the container
        const authProvider = constructContainer.getConstructFactory('auth');
        if (authProvider) {
          const authResources = authProvider.getInstance({
            constructContainer,
            outputStorageStrategy,
          });
          
          userPool = authResources.resources.userPool;
          
          // Create the authorizer
          authorizer = new CognitoUserPoolsAuthorizer(scope, `${id}-authorizer`, {
            cognitoUserPools: [userPool],
          });
          
          // Set the authorizer as the default for the API
          api.addGatewayResponse('DEFAULT_4XX', {
            responseType: 'DEFAULT_4XX',
            responseTemplates: {
              'application/json': '{"message":$context.error.messageString}',
            },
          });
        }
      } catch (error) {
        throw new AmplifyUserError('AuthResourcesNotFoundError', {
          message: 'Failed to get auth resources for REST API authentication',
          resolution: 'Make sure you have defined auth resources using defineAuth() before using authenticated routes',
        });
      }
    }
    
    // Process each route
    for (const route of props.routes) {
      // Determine if this route requires auth
      const requiresAuth = route.requiresAuth || 
        (props.auth?.authenticatedRoutes?.some(authPath => 
          isPathMatch(route.path, authPath)) ?? false);
      
      // Get the function for this route
      const functionResources = route.integration.resources;
      
      if (!functionResources || !functionResources.lambda) {
        throw new AmplifyUserError('InvalidRouteIntegrationError', {
          message: `Invalid integration for route ${route.path}`,
          resolution: 'Make sure the integration is a valid function created with defineFunction()',
        });
      }
      
      // Create the Lambda integration
      const integration = new LambdaIntegration(functionResources.lambda);
      
      // Normalize the path (ensure it starts with /)
      const normalizedPath = route.path.startsWith('/') ? route.path : `/${route.path}`;
      
      // Create the resource path
      let resource = api.root;
      const pathParts = normalizedPath.split('/').filter(Boolean);
      
      for (const part of pathParts) {
        const isPathParameter = part.startsWith('{') && part.endsWith('}');
        const resourceName = isPathParameter ? part.substring(1, part.length - 1) : part;
        
        try {
          resource = resource.getResource(resourceName) || 
                    resource.addResource(isPathParameter ? `{${resourceName}}` : resourceName);
        } catch (error) {
          throw new AmplifyUserError('InvalidRoutePathError', {
            message: `Failed to create resource for path ${normalizedPath}`,
            resolution: 'Check that the path format is valid',
          });
        }
      }
      
      // Add methods to the resource
      const methods: Method[] = [];
      for (const method of route.methods) {
        const methodOptions = requiresAuth && authorizer ? {
          authorizationType: AuthorizationType.COGNITO,
          authorizer,
        } : {};
        
        methods.push(resource.addMethod(method, integration, methodOptions));
      }
      
      // Store the route information
      routes[normalizedPath] = methods;
      routeConfigs.push({
        path: normalizedPath,
        methods: route.methods,
        requiresAuth,
      });
    }
    
    // Store the resources
    this.resources = {
      api,
      userPool,
      routes,
    };
    
    // Store the output
    outputStorageStrategy.addBackendOutputEntry(restApiOutputKey, {
      version: '1',
      payload: {
        restApiId: api.restApiId,
        restApiEndpoint: api.url,
        restApiName: props.name,
        routes: routeConfigs,
      },
    });
  }
}

/**
 * Check if a route path matches an authenticated path pattern
 */
function isPathMatch(routePath: string, authPath: string): boolean {
  // Normalize paths
  const normalizedRoutePath = routePath.startsWith('/') ? routePath : `/${routePath}`;
  const normalizedAuthPath = authPath.startsWith('/') ? authPath : `/${authPath}`;
  
  // Exact match
  if (normalizedRoutePath === normalizedAuthPath) {
    return true;
  }
  
  // Wildcard match (e.g., /protected/*)
  if (normalizedAuthPath.endsWith('*')) {
    const prefix = normalizedAuthPath.slice(0, -1);
    return normalizedRoutePath.startsWith(prefix);
  }
  
  return false;
}