import { RestApi, Resource, Method } from 'aws-cdk-lib/aws-apigateway';

/**
 * Resources created by the REST API construct
 */
export interface RestApiResources {
  /**
   * The REST API instance
   */
  restApi: RestApi;
  
  /**
   * The root resource of the REST API
   */
  rootResource: Resource;
  
  /**
   * Map of path to resource
   */
  resources: Record<string, Resource>;
  
  /**
   * Map of path to methods
   */
  methods: Record<string, Method>;
}