import { FunctionResources } from '@aws-amplify/plugin-types';
import { ResourceProvider } from '@aws-amplify/plugin-types';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { IRestApi, Method } from 'aws-cdk-lib/aws-apigateway';

/**
 * HTTP methods supported by the REST API
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

/**
 * Integration types for REST API routes
 */
export type RouteIntegration = ResourceProvider<FunctionResources>;

/**
 * Configuration for a REST API route
 */
export type RestApiRoute = {
  /**
   * The path for the route (e.g., '/items', '/items/{id}')
   */
  path: string;
  
  /**
   * HTTP methods supported by this route
   */
  methods: HttpMethod[];
  
  /**
   * The Lambda function to integrate with this route
   */
  integration: RouteIntegration;
  
  /**
   * Whether this route requires authentication
   * @default false
   */
  requiresAuth?: boolean;
};

/**
 * Authentication configuration for the REST API
 */
export type RestApiAuthConfig = {
  /**
   * List of paths that require authentication
   * Can use wildcards (e.g., '/protected/*')
   */
  authenticatedRoutes?: string[];
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
   * Routes to be defined in the REST API
   */
  routes: RestApiRoute[];
  
  /**
   * Authentication configuration for the REST API
   */
  auth?: RestApiAuthConfig;
};

/**
 * Resources exposed by the REST API construct
 */
export type RestApiResources = {
  /**
   * The API Gateway REST API
   */
  api: IRestApi;
  
  /**
   * The Cognito User Pool used for authentication (if configured)
   */
  userPool?: IUserPool;
  
  /**
   * Map of defined routes and their methods
   */
  routes: Record<string, Method[]>;
};