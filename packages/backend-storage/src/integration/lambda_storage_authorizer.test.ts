import { test, expect, describe, beforeEach } from 'vitest';
import { defineFunction } from '@aws-amplify/backend-function';
import { defineStorage } from '../factory.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AmplifyStorage } from '../construct.js';

describe('Lambda storage authorizer', () => {
  let app: App;
  let stack: Stack;
  let storage: AmplifyStorage;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app);
  });

  test('creates lambda authorizer with correct permissions', () => {
    const authorizerFn = defineFunction({
      entry: './src/test/mock-authorizer.ts'
    });

    storage = defineStorage({
      name: 'test-storage',
      customAuthorizer: {
        function: authorizerFn,
        paths: ['private/*', 'friends-only/*']
      }
    }).getInstance(stack);

    const template = Template.fromStack(stack);

    // Verify lambda function is created
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
      Runtime: 'nodejs20.x'
    });

    // Verify IAM permissions
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: expect.arrayContaining([
          expect.objectContaining({
            Effect: 'Allow',
            Action: [
              's3:GetObject',
              's3:PutObject',
              's3:DeleteObject',
              's3:ListBucket'
            ],
            Resource: expect.arrayContaining([
              { 'Fn::GetAtt': expect.arrayContaining(['testStorageBucket']) },
              {
                'Fn::Join': expect.arrayContaining([
                  ['', ['arn:aws:s3:::', { Ref: expect.stringMatching(/.*Bucket.*/) }, '/*']]
                ])
              }
            ])
          })
        ])
      }
    });
  });

  test('authorizer paths are properly configured', () => {
    const authorizerFn = defineFunction({
      entry: './src/test/mock-authorizer.ts'
    });

    storage = defineStorage({
      name: 'test-storage',
      customAuthorizer: {
        function: authorizerFn,
        paths: ['private/*']
      }
    }).getInstance(stack);

    expect(storage.customAuthorizer?.getPaths()).toEqual(['private/*']);
  });
});