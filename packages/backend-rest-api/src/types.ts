import { 
  AuthConfig, 
  EndpointConfig, 
  HttpMethod, 
  PathConfig, 
  RestApiProps as ConstructRestApiProps 
} from '@aws-amplify/rest-api-construct';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { ConstructFactory } from '@aws-amplify/plugin-types';

/**
 * Type for a function that can be used as an integration
 */
export type FunctionIntegration = ConstructFactory<{ resources: { lambda: IFunction } }>;

/**
 * Integration type for REST API endpoints
 */
export type EndpointIntegrationProps = {
  /**
   * Lambda function to integrate with
   */
  function?: FunctionIntegration;
  
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
export type EndpointConfigProps = {
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
  integration: EndpointIntegrationProps;
};

/**
 * Configuration for a REST API path
 */
export type PathConfigProps = {
  /**
   * Endpoints for this path
   */
  endpoints: EndpointConfigProps[];
};

/**
 * Properties for the REST API
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
  paths: Record<string, PathConfigProps>;
  
  /**
   * Default authentication configuration for all endpoints
   * Can be overridden at the endpoint level
   */
  defaultAuthConfig?: AuthConfig;
}