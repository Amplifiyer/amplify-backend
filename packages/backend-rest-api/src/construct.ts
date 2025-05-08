import { Construct } from 'constructs';
import { 
  AuthorizationType, 
  CfnAuthorizer, 
  CfnMethod, 
  CfnResource, 
  CognitoUserPoolsAuthorizer, 
  EndpointType, 
  LambdaIntegration, 
  RestApi 
} from 'aws-cdk-lib/aws-apigateway';
import { BackendOutputStorageStrategy } from '@aws-amplify/plugin-types';
import { RestApiOutput } from '@aws-amplify/backend-output-schemas';
import { CfnOutput, Stack } from 'aws-cdk-lib';
import { AmplifyRestApiFactoryProps, HttpMethod, RouteConfig } from './types.js';
import { AuthResources } from '@aws-amplify/plugin-types';

/**
 * Resources created by the REST API construct
 */
export type RestApiResources = {
  /**
   * The REST API instance
   */
  restApi: RestApi;

  /**
   * CloudFormation resources
   */
  cfnResources: {
    /**
     * The CloudFormation REST API resource
     */
    cfnRestApi: CfnResource;

    /**
     * The CloudFormation authorizer resource (if auth is configured)
     */
    cfnAuthorizer?: CfnAuthorizer;

    /**
     * The CloudFormation method resources
     */
    cfnMethods: Record<string, CfnMethod>;
  };
};

/**
 * Properties for the AmplifyRestApi construct
 */
export type AmplifyRestApiProps = AmplifyRestApiFactoryProps & {
  /**
   * Output storage strategy for storing REST API outputs
   */
  outputStorageStrategy: BackendOutputStorageStrategy<RestApiOutput>;

  /**
   * Auth resources for configuring authorizers (optional)
   */
  authResources?: AuthResources;
};

/**
 * Construct for creating a REST API in an Amplify backend
 */
export class AmplifyRestApi extends Construct {
  /**
   * The resources created by this construct
   */
  readonly resources: RestApiResources;

  /**
   * Create a new AmplifyRestApi
   */
  constructor(scope: Construct, id: string, private readonly props: AmplifyRestApiProps) {
    super(scope, id);

    // Create the REST API
    const restApi = new RestApi(this, 'RestApi', {
      restApiName: props.name,
      description: `REST API for ${props.name}`,
      endpointTypes: [props.endpointType ?? EndpointType.REGIONAL],
      defaultCorsPreflightOptions: props.cors === true ? {
        allowOrigins: ['*'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Amz-Security-Token'],
      } : props.cors || undefined,
      defaultMethodOptions: props.defaultMethodOptions,
      ...props.restApiProps,
    });

    // Create authorizer if auth resources are provided
    let authorizer: CognitoUserPoolsAuthorizer | undefined;
    if (props.authResources?.userPool) {
      authorizer = new CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
        cognitoUserPools: [props.authResources.userPool],
        authorizerName: `${props.name}-cognito-authorizer`,
      });
    }

    // Create routes and methods
    const cfnMethods: Record<string, CfnMethod> = {};
    
    if (props.routes) {
      Object.entries(props.routes).forEach(([routePath, routeConfig]) => {
        // Create the resource path
        const resource = this.createResourcePath(restApi, routePath);
        
        // Add methods to the resource
        routeConfig.methods.forEach((method) => {
          this.addMethodToResource(
            resource, 
            method, 
            routeConfig, 
            authorizer, 
            cfnMethods
          );
        });
      });
    }

    // Store the resources
    this.resources = {
      restApi,
      cfnResources: {
        cfnRestApi: restApi.node.defaultChild as CfnResource,
        cfnAuthorizer: authorizer?.node.defaultChild as CfnAuthorizer,
        cfnMethods,
      },
    };

    // Store outputs
    this.storeOutputs(restApi);
  }

  /**
   * Create a resource path in the REST API
   */
  private createResourcePath(restApi: RestApi, path: string): RestApi.IResource {
    if (path === '/' || path === '') {
      return restApi.root;
    }

    // Remove leading slash if present
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    
    // Split the path into segments
    const pathSegments = normalizedPath.split('/');
    
    // Start with the root resource
    let resource: RestApi.IResource = restApi.root;
    
    // Create or get each resource in the path
    pathSegments.forEach((segment) => {
      // Check if the segment is a path parameter
      if (segment.startsWith('{') && segment.endsWith('}')) {
        // Path parameter
        const paramName = segment.substring(1, segment.length - 1);
        resource = resource.getResource(segment) || 
                  resource.addResource(`{${paramName}}`);
      } else {
        // Regular path segment
        resource = resource.getResource(segment) || 
                  resource.addResource(segment);
      }
    });
    
    return resource;
  }

  /**
   * Add a method to a resource
   */
  private addMethodToResource(
    resource: RestApi.IResource,
    httpMethod: HttpMethod,
    routeConfig: RouteConfig,
    authorizer?: CognitoUserPoolsAuthorizer,
    cfnMethods: Record<string, CfnMethod> = {}
  ): void {
    // Determine authorization type
    const authType = routeConfig.authorizationType ?? 
                    this.props.defaultAuthorizationType ?? 
                    (authorizer ? AuthorizationType.COGNITO : AuthorizationType.NONE);

    // Create method options
    const methodOptions = {
      ...this.props.defaultMethodOptions,
      ...routeConfig.methodOptions,
      authorizationType: authType,
      authorizer: authType === AuthorizationType.COGNITO ? authorizer : undefined,
    };

    // Add the method to the resource
    if (routeConfig.handler) {
      // Get the Lambda function from the handler
      const lambda = routeConfig.handler.getInstance({
        constructContainer: {} as any, // This is a hack, we need to fix this
        outputStorageStrategy: this.props.outputStorageStrategy,
      }).resources.lambda;

      // Create Lambda integration
      const integration = new LambdaIntegration(lambda);
      
      // Add the method with Lambda integration
      const method = resource.addMethod(httpMethod, integration, methodOptions);
      
      // Store the CloudFormation method
      const resourcePath = this.getResourcePath(resource);
      cfnMethods[`${resourcePath}:${httpMethod}`] = method.node.defaultChild as CfnMethod;
    } else {
      // Add the method without integration (mock)
      const method = resource.addMethod(httpMethod, undefined, methodOptions);
      
      // Store the CloudFormation method
      const resourcePath = this.getResourcePath(resource);
      cfnMethods[`${resourcePath}:${httpMethod}`] = method.node.defaultChild as CfnMethod;
    }
  }

  /**
   * Get the full path of a resource
   */
  private getResourcePath(resource: RestApi.IResource): string {
    // This is a hack to get the full path of a resource
    // The actual path is not exposed directly by the CDK
    const resourceId = resource.node.id;
    const parts = resourceId.split('/');
    return '/' + parts.slice(1).join('/');
  }

  /**
   * Store outputs for the REST API
   */
  private storeOutputs(restApi: RestApi): void {
    // Store the REST API URL in the outputs
    this.props.outputStorageStrategy.store({
      name: 'restApiUrl',
      value: restApi.url,
    });

    // Add a CloudFormation output for the REST API URL
    new CfnOutput(this, 'RestApiUrl', {
      value: restApi.url,
      description: 'URL of the REST API',
      exportName: `${this.props.name}-RestApiUrl`,
    });

    // Store the REST API ID in the outputs
    this.props.outputStorageStrategy.store({
      name: 'restApiId',
      value: restApi.restApiId,
    });

    // Store the REST API root resource ID in the outputs
    this.props.outputStorageStrategy.store({
      name: 'restApiRootResourceId',
      value: restApi.restApiRootResourceId,
    });
  }
}