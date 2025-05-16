import { describe, it, mock } from 'node:test';
import { defineRestApi } from './factory.js';
import { RestApiProps } from './types.js';
import assert from 'node:assert';
import { BackendOutputStorageStrategy } from '@aws-amplify/plugin-types';
import { RestApiOutput, restApiOutputKey } from '@aws-amplify/backend-output-schemas';
import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ConstructContainerStub } from '@aws-amplify/backend-platform-test-stubs';

describe('defineRestApi', () => {
  it('should create a REST API with the given configuration', () => {
    // Mock function resources
    const mockFunctionResources = {
      resources: {
        lambda: {
          functionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
          grantInvoke: mock.fn(),
        },
      },
    };

    // Create REST API props
    const restApiProps: RestApiProps = {
      name: 'test-api',
      routes: [
        {
          path: '/items',
          methods: ['GET', 'POST'],
          integration: mockFunctionResources,
        },
      ],
    };

    // Mock output storage strategy
    const mockOutputStorageStrategy = {
      addBackendOutputEntry: mock.fn(),
    } as unknown as BackendOutputStorageStrategy<RestApiOutput>;

    // Create the REST API factory
    const restApiFactory = defineRestApi(restApiProps);

    // Create a stack for testing
    const stack = new Stack();

    // Create a construct container stub
    const constructContainer = new ConstructContainerStub();

    // Get the REST API instance
    const restApi = restApiFactory.getInstance({
      constructContainer,
      outputStorageStrategy: mockOutputStorageStrategy,
    });

    // Assert that the REST API was created
    assert.ok(restApi);
    
    // Verify that output was stored
    assert.equal(mockOutputStorageStrategy.addBackendOutputEntry.mock.calls.length, 1);
    assert.equal(mockOutputStorageStrategy.addBackendOutputEntry.mock.calls[0].arguments[0], restApiOutputKey);
    
    // Verify that the output has the correct structure
    const output = mockOutputStorageStrategy.addBackendOutputEntry.mock.calls[0].arguments[1];
    assert.equal(output.version, '1');
    assert.equal(output.payload.restApiName, 'test-api');
    assert.ok(output.payload.restApiId);
    assert.ok(output.payload.restApiEndpoint);
    assert.equal(output.payload.routes.length, 1);
    assert.equal(output.payload.routes[0].path, '/items');
    assert.deepEqual(output.payload.routes[0].methods, ['GET', 'POST']);
  });

  it('should throw an error when no routes are provided', () => {
    // Create REST API props with no routes
    const restApiProps: RestApiProps = {
      name: 'test-api',
      routes: [],
    };

    // Create the REST API factory
    const restApiFactory = defineRestApi(restApiProps);

    // Mock output storage strategy
    const mockOutputStorageStrategy = {
      addBackendOutputEntry: mock.fn(),
    } as unknown as BackendOutputStorageStrategy<RestApiOutput>;

    // Create a construct container stub
    const constructContainer = new ConstructContainerStub();

    // Assert that getting the instance throws an error
    assert.throws(() => {
      restApiFactory.getInstance({
        constructContainer,
        outputStorageStrategy: mockOutputStorageStrategy,
      });
    }, /REST API must have at least one route defined/);
  });
});