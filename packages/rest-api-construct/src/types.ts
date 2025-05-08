import { 
  AuthorizationType, 
  CognitoUserPoolsAuthorizer, 
  IAuthorizer, 
  LambdaIntegration, 
  MethodOptions, 
  MockIntegration, 
  PassthroughBehavior 
} from 'aws-cdk-lib/aws-apigateway';
import { IFunction } from 'aws-cdk-lib/aws-lambda';

/**
 * Authentication configuration for REST API endpoints
 */
export type AuthConfig = {
  /**
   * Allow unauthenticated/guest access to this endpoint
   * @default false
   */
  allowGuests?: boolean;
  
  /**
   * Require authentication for this endpoint
   * @default true
   */
  requireAuthentication?: boolean;
  
  /**
   * Restrict access to specific Cognito user pool groups
   * If specified, only users in these groups can access the endpoint
   */
  groups?: string[];
};

/**
 * HTTP methods supported by the REST API
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD' | 'ANY';

/**
 * Integration type for REST API endpoints
 */
export type EndpointIntegration = {
  /**
   * Lambda function to integrate with
   */
  function?: IFunction;
  
  /**
   * Mock integration response
   */
  mock?: {
    /**
     * Status code for the mock response
     * @default 200
     */
    statusCode?: string;
    
    /**
     * Response templates for the mock integration
     */
    responseTemplates?: Record<string, string>;
  };
};

/**
 * Configuration for a REST API endpoint
 */
export type EndpointConfig = {
  /**
   * HTTP method for the endpoint
   */
  method: HttpMethod;
  
  /**
   * Authentication configuration for the endpoint
   */
  auth?: AuthConfig;
  
  /**
   * Integration for the endpoint
   */
  integration: EndpointIntegration;
};

/**
 * Configuration for a REST API path
 */
export type PathConfig = {
  /**
   * Endpoints for this path
   */
  endpoints: EndpointConfig[];
};

/**
 * Properties for the REST API construct
 */
export interface RestApiProps {
  /**
   * Name of the REST API
   */
  name?: string;
  
  /**
   * Description of the REST API
   */
  description?: string;
  
  /**
   * Configuration for API paths and endpoints
   */
  paths: Record<string, PathConfig>;
  
  /**
   * Default authentication configuration for all endpoints
   * Can be overridden at the endpoint level
   */
  defaultAuthConfig?: AuthConfig;
}