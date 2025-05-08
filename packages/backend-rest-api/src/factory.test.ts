import { describe, it, mock } from 'node:test';
import { defineRestApi } from './factory.js';
import assert from 'node:assert';
import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Construct } from 'constructs';
import { BackendOutputStorageStrategy } from '@aws-amplify/plugin-types';
import { RestApiOutput } from '@aws-amplify/backend-output-schemas';

describe('defineRestApi', () => {
  it('should create a REST API with default values', () => {
    // Create a mock function resource provider
    const mockFunctionProvider = {
      resources: {
        lambda: {
          functionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
          grantInvoke: mock.fn()
        },
        cfnResources: {
          cfnFunction: {}
        }
      }
    };

    // Create a mock output storage strategy
    const mockOutputStorageStrategy = {
      store: mock.fn()
    } as unknown as BackendOutputStorageStrategy<RestApiOutput>;

    // Create a mock construct container
    const mockConstructContainer = {
      getOrCompute: (generator: any) => {
        const stack = new Stack();
        return generator.generateContainerEntry({
          scope: stack,
          backendSecretResolver: {},
        });
      }
    };

    // Define a REST API
    const api = defineRestApi({
      routes: {
        '/items': {
          GET: {
            function: mockFunctionProvider
          },
          POST: {
            function: mockFunctionProvider
          }
        },
        '/items/{id}': {
          GET: {
            function: mockFunctionProvider
          }
        }
      }
    });

    // Get the instance
    const instance = api.getInstance({
      constructContainer: mockConstructContainer,
      outputStorageStrategy: mockOutputStorageStrategy
    });

    // Verify the instance
    assert.ok(instance);
    assert.ok(instance.resources);
    assert.ok(instance.resources.restApi);
    assert.ok(instance.resources.cfnResources);
    assert.ok(instance.resources.cfnResources.cfnRestApi);

    // Verify the output storage was called
    assert.strictEqual(mockOutputStorageStrategy.store.mock.callCount(), 1);
  });

  it('should create a REST API with custom values', () => {
    // Create a mock function resource provider
    const mockFunctionProvider = {
      resources: {
        lambda: {
          functionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
          grantInvoke: mock.fn()
        },
        cfnResources: {
          cfnFunction: {}
        }
      }
    };

    // Create a mock output storage strategy
    const mockOutputStorageStrategy = {
      store: mock.fn()
    } as unknown as BackendOutputStorageStrategy<RestApiOutput>;

    // Create a mock construct container
    const mockConstructContainer = {
      getOrCompute: (generator: any) => {
        const stack = new Stack();
        return generator.generateContainerEntry({
          scope: stack,
          backendSecretResolver: {},
        });
      }
    };

    // Define a REST API with custom values
    const api = defineRestApi({
      name: 'custom-api',
      cors: false,
      resourceGroupName: 'custom-group',
      routes: {
        '/items': {
          GET: {
            function: mockFunctionProvider
          }
        }
      }
    });

    // Get the instance
    const instance = api.getInstance({
      constructContainer: mockConstructContainer,
      outputStorageStrategy: mockOutputStorageStrategy
    });

    // Verify the instance
    assert.ok(instance);
    assert.ok(instance.resources);
    assert.ok(instance.resources.restApi);
    assert.ok(instance.resources.cfnResources);
    assert.ok(instance.resources.cfnResources.cfnRestApi);

    // Verify the output storage was called
    assert.strictEqual(mockOutputStorageStrategy.store.mock.callCount(), 1);
  });

  it('should create a CDK template with expected resources', () => {
    // Create a mock function resource provider
    const mockFunctionProvider = {
      resources: {
        lambda: {
          functionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
          grantInvoke: mock.fn()
        },
        cfnResources: {
          cfnFunction: {}
        }
      }
    };

    // Create a stack
    const stack = new Stack();

    // Define a REST API
    const api = defineRestApi({
      name: 'test-api',
      routes: {
        '/items': {
          GET: {
            function: mockFunctionProvider
          }
        }
      }
    });

    // Create a mock construct container that will add the API to our stack
    const mockConstructContainer = {
      getOrCompute: (generator: any) => {
        return generator.generateContainerEntry({
          scope: stack,
          backendSecretResolver: {},
        });
      }
    };

    // Create a mock output storage strategy
    const mockOutputStorageStrategy = {
      store: mock.fn()
    } as unknown as BackendOutputStorageStrategy<RestApiOutput>;

    // Get the instance
    api.getInstance({
      constructContainer: mockConstructContainer,
      outputStorageStrategy: mockOutputStorageStrategy
    });

    // Generate the CloudFormation template
    const template = Template.fromStack(stack);

    // Verify the template contains the expected resources
    template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
    template.resourceCountIs('AWS::ApiGateway::Method', 1);
    template.resourceCountIs('AWS::ApiGateway::Resource', 1);
    template.resourceCountIs('AWS::ApiGateway::Deployment', 1);
    template.resourceCountIs('AWS::ApiGateway::Stage', 1);
  });
});