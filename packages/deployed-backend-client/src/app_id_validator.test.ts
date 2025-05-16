import { beforeEach, describe, it, mock } from 'node:test';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { AppIdValidator } from './app_id_validator.js';
import assert from 'node:assert';
import { AmplifyUserError } from '@aws-amplify/platform-core';

void describe('AppIdValidator', () => {
  const amplifyClientMock = new AmplifyClient({ region: 'test-region' });
  const amplifyClientSendMock = mock.fn(() => Promise.resolve({}));
  const amplifyClientConfigRegionMock = mock.fn(() => Promise.resolve('test-region'));
  
  mock.method(amplifyClientMock, 'send', amplifyClientSendMock);
  mock.method(amplifyClientMock.config, 'region', amplifyClientConfigRegionMock);

  beforeEach(() => {
    amplifyClientSendMock.mock.resetCalls();
    amplifyClientConfigRegionMock.mock.resetCalls();
  });

  void it('succeeds when app ID exists', async () => {
    const validator = new AppIdValidator(amplifyClientMock);
    await validator.validateAppId('valid-app-id');
    assert.equal(amplifyClientSendMock.mock.callCount(), 1);
  });

  void it('throws AmplifyUserError when app ID does not exist (NotFoundException)', async () => {
    const notFoundError = new Error('App not found');
    notFoundError.name = 'NotFoundException';
    
    amplifyClientSendMock.mock.mockImplementationOnce(() => {
      throw notFoundError;
    });

    const validator = new AppIdValidator(amplifyClientMock);
    
    await assert.rejects(
      () => validator.validateAppId('invalid-app-id'),
      (error) => {
        assert(error instanceof AmplifyUserError);
        assert.equal(error.name, 'InvalidAppIdError');
        assert(error.message.includes('invalid-app-id'));
        assert(error.message.includes('test-region'));
        return true;
      }
    );
  });

  void it('throws AmplifyUserError when app ID does not exist (message check)', async () => {
    const notFoundError = new Error('App not found for ID: invalid-app-id');
    
    amplifyClientSendMock.mock.mockImplementationOnce(() => {
      throw notFoundError;
    });

    const validator = new AppIdValidator(amplifyClientMock);
    
    await assert.rejects(
      () => validator.validateAppId('invalid-app-id'),
      (error) => {
        assert(error instanceof AmplifyUserError);
        assert.equal(error.name, 'InvalidAppIdError');
        return true;
      }
    );
  });

  void it('re-throws other errors', async () => {
    const otherError = new Error('Some other error');
    otherError.name = 'OtherError';
    
    amplifyClientSendMock.mock.mockImplementationOnce(() => {
      throw otherError;
    });

    const validator = new AppIdValidator(amplifyClientMock);
    
    await assert.rejects(
      () => validator.validateAppId('valid-app-id'),
      (error) => {
        assert.equal(error.name, 'OtherError');
        assert.equal(error.message, 'Some other error');
        return true;
      }
    );
  });
});