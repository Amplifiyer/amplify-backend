import { AmplifyStorage } from './construct.js';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { AmplifyFunction } from '@aws-amplify/backend-function';
import { ConstructFactory } from '@aws-amplify/plugin-types';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { StoragePath } from './types.js';

/**
 * Custom lambda authorizer for storage operations.
 * This will be called to authorize storage operations at runtime.
 */
export class CustomStorageAuthorizer {
  private lambdaFunction: IFunction;
  
  /**
   * Creates a custom authorizer for storage operations.
   * 
   * @param storage - The storage resource to create the authorizer for
   * @param lambdaFactory - Factory that creates the lambda function for authorization
   * @param paths - Optional list of storage paths this authorizer applies to. If not specified, applies to all paths.
   */
  constructor(
    private readonly storage: AmplifyStorage,
    lambdaFactory: ConstructFactory<AmplifyFunction>,
    private readonly paths?: StoragePath[]
  ) {
    // Create the lambda function
    const authFn = lambdaFactory.getInstance(storage);
    this.lambdaFunction = authFn.resources.lambda;
    
    // Grant the lambda permission to access the storage bucket
    this.lambdaFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:PutObject',
          's3:DeleteObject',
          's3:ListBucket'
        ],
        resources: [
          storage.resources.bucket.bucketArn,
          `${storage.resources.bucket.bucketArn}/*`
        ]
      })
    );
    
    // Set up the lambda function to be invoked for authorization
    // Note: The actual integration with the S3 bucket will be handled in the construct
  }
  
  /**
   * Get the lambda function that performs authorization
   */
  getFunction(): IFunction {
    return this.lambdaFunction;
  }
  
  /**
   * Get the paths this authorizer applies to
   */
  getPaths(): StoragePath[] | undefined {
    return this.paths;
  }
}