import { 
  AuthorizationType, 
  CorsOptions, 
  EndpointType, 
  MethodOptions, 
  RestApiProps 
} from 'aws-cdk-lib/aws-apigateway';
import { ConstructFactory, ResourceProvider } from '@aws-amplify/plugin-types';
import { FunctionResources } from '@aws-amplify/plugin-types';

/**
 * Properties for defining a REST API
 */
export type AmplifyRestApiFactoryProps = {
  /**
   * The name of the REST API
   */
  name: string;

  /**
   * CORS configuration for the API
   */
  cors?: boolean | CorsOptions;

  /**
   * The endpoint type for the API
   * @default EndpointType.REGIONAL
   */
  endpointType?: EndpointType;

  /**
   * Default authorization type for methods
   * @default AuthorizationType.NONE
   */
  defaultAuthorizationType?: AuthorizationType;

  /**
   * Default method options
   */
  defaultMethodOptions?: MethodOptions;

  /**
   * Additional properties for the REST API
   */
  restApiProps?: Partial<RestApiProps>;

  /**
   * Routes configuration for the API
   */
  routes?: Record<string, RouteConfig>;
};

/**
 * Configuration for a route in the REST API
 */
export type RouteConfig = {
  /**
   * HTTP methods to expose for this route
   */
  methods: HttpMethod[];

  /**
   * Function handler for this route
   */
  handler?: ConstructFactory<ResourceProvider<FunctionResources>>;

  /**
   * Authorization type for this route
   * @default The defaultAuthorizationType from the API configuration
   */
  authorizationType?: AuthorizationType;

  /**
   * Method options for this route
   */
  methodOptions?: MethodOptions;
};

/**
 * HTTP methods supported by the REST API
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD' | 'ANY';