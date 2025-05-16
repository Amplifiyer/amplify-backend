import assert from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';
import { AppBackendIdentifierResolver } from './backend_identifier_resolver.js';
import { AppIdValidator } from '@aws-amplify/deployed-backend-client';
import { AmplifyUserError } from '@aws-amplify/platform-core';

void describe('BackendIdentifierResolver', () => {
  void describe('resolveDeployedBackendIdentifier', () => {
    void it('returns an App Name and Branch identifier', async () => {
      const backendIdResolver = new AppBackendIdentifierResolver({
        resolve: () => Promise.resolve('testAppName'),
      });
      assert.deepStrictEqual(
        await backendIdResolver.resolveDeployedBackendIdentifier({
          branch: 'test',
        }),
        {
          appName: 'testAppName',
          branchName: 'test',
        },
      );
    });
    void it('returns a App Id identifier', async () => {
      const backendIdResolver = new AppBackendIdentifierResolver({
        resolve: () => Promise.resolve('testAppName'),
      });
      const actual = await backendIdResolver.resolveDeployedBackendIdentifier({
        appId: 'my-id',
        branch: 'my-branch',
      });
      assert.deepStrictEqual(actual, {
        namespace: 'my-id',
        name: 'my-branch',
        type: 'branch',
      });
    });
    void it('returns a Stack name identifier', async () => {
      const backendIdResolver = new AppBackendIdentifierResolver({
        resolve: () => Promise.resolve('testAppName'),
      });
      assert.deepEqual(
        await backendIdResolver.resolveDeployedBackendIdentifier({
          stack: 'my-stack',
        }),
        {
          stackName: 'my-stack',
        },
      );
    });

    void describe('with app ID validation', () => {
      const mockAppIdValidator = {
        validateAppId: mock.fn(() => Promise.resolve()),
      } as unknown as AppIdValidator;

      beforeEach(() => {
        mock.reset();
      });

      void it('validates app ID when provided', async () => {
        const backendIdResolver = new AppBackendIdentifierResolver(
          {
            resolve: () => Promise.resolve('testAppName'),
          },
          mockAppIdValidator
        );

        await backendIdResolver.resolveDeployedBackendIdentifier({
          appId: 'valid-app-id',
          branch: 'test-branch',
        });

        assert.equal(mockAppIdValidator.validateAppId.mock.callCount(), 1);
        assert.deepEqual(mockAppIdValidator.validateAppId.mock.calls[0].arguments, ['valid-app-id']);
      });

      void it('propagates validation errors', async () => {
        const validationError = new AmplifyUserError('InvalidAppIdError', {
          message: 'App ID does not exist',
          resolution: 'Use a valid app ID',
        });

        mockAppIdValidator.validateAppId = mock.fn(() => Promise.reject(validationError));

        const backendIdResolver = new AppBackendIdentifierResolver(
          {
            resolve: () => Promise.resolve('testAppName'),
          },
          mockAppIdValidator
        );

        await assert.rejects(
          () => backendIdResolver.resolveDeployedBackendIdentifier({
            appId: 'invalid-app-id',
            branch: 'test-branch',
          }),
          (error) => {
            assert(error instanceof AmplifyUserError);
            assert.equal(error.name, 'InvalidAppIdError');
            return true;
          }
        );
      });

      void it('does not validate when app ID is not provided', async () => {
        const backendIdResolver = new AppBackendIdentifierResolver(
          {
            resolve: () => Promise.resolve('testAppName'),
          },
          mockAppIdValidator
        );

        await backendIdResolver.resolveDeployedBackendIdentifier({
          branch: 'test-branch',
        });

        assert.equal(mockAppIdValidator.validateAppId.mock.callCount(), 0);
      });
    });
  });

  void describe('resolveBackendIdentifier', () => {
    void it('returns backend identifier from App Name and Branch identifier', async () => {
      const backendIdResolver = new AppBackendIdentifierResolver({
        resolve: () => Promise.resolve('testAppName'),
      });
      assert.deepEqual(
        await backendIdResolver.resolveBackendIdentifier({
          appId: 'testAppName',
          branch: 'test',
        }),
        {
          namespace: 'testAppName',
          name: 'test',
          type: 'branch',
        },
      );
    });
    void it('returns backend identifier from Stack identifier', async () => {
      const backendIdResolver = new AppBackendIdentifierResolver({
        resolve: () => Promise.resolve('testAppName'),
      });
      assert.deepEqual(
        await backendIdResolver.resolveBackendIdentifier({
          stack: 'amplify-reasonableName-userName-branch-testHash',
        }),
        {
          namespace: 'reasonableName',
          name: 'userName',
          type: 'branch',
          hash: 'testHash',
        },
      );
    });

    void describe('with app ID validation', () => {
      const mockAppIdValidator = {
        validateAppId: mock.fn(() => Promise.resolve()),
      } as unknown as AppIdValidator;

      beforeEach(() => {
        mock.reset();
      });

      void it('validates app ID when provided', async () => {
        const backendIdResolver = new AppBackendIdentifierResolver(
          {
            resolve: () => Promise.resolve('testAppName'),
          },
          mockAppIdValidator
        );

        await backendIdResolver.resolveBackendIdentifier({
          appId: 'valid-app-id',
          branch: 'test-branch',
        });

        assert.equal(mockAppIdValidator.validateAppId.mock.callCount(), 1);
        assert.deepEqual(mockAppIdValidator.validateAppId.mock.calls[0].arguments, ['valid-app-id']);
      });

      void it('propagates validation errors', async () => {
        const validationError = new AmplifyUserError('InvalidAppIdError', {
          message: 'App ID does not exist',
          resolution: 'Use a valid app ID',
        });

        mockAppIdValidator.validateAppId = mock.fn(() => Promise.reject(validationError));

        const backendIdResolver = new AppBackendIdentifierResolver(
          {
            resolve: () => Promise.resolve('testAppName'),
          },
          mockAppIdValidator
        );

        await assert.rejects(
          () => backendIdResolver.resolveBackendIdentifier({
            appId: 'invalid-app-id',
            branch: 'test-branch',
          }),
          (error) => {
            assert(error instanceof AmplifyUserError);
            assert.equal(error.name, 'InvalidAppIdError');
            return true;
          }
        );
      });
    });
  });
});
