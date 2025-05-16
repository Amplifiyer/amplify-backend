import assert from 'node:assert';
import { it, mock } from 'node:test';
import { SandboxBackendIdResolver } from '../commands/sandbox/sandbox_id_resolver.js';
import { AppBackendIdentifierResolver } from './backend_identifier_resolver.js';
import { BackendIdentifierResolverWithFallback } from './backend_identifier_with_sandbox_fallback.js';
import { AppIdValidator } from '@aws-amplify/deployed-backend-client';

void it('if backend identifier resolves without error, the resolved id is returned', async () => {
  const namespaceResolver = {
    resolve: () => Promise.resolve('testAppName'),
  };

  const mockAppIdValidator = {
    validateAppId: mock.fn(() => Promise.resolve()),
  } as unknown as AppIdValidator;

  const defaultResolver = new AppBackendIdentifierResolver(namespaceResolver, mockAppIdValidator);
  const sandboxResolver = new SandboxBackendIdResolver(namespaceResolver);
  const backendIdResolver = new BackendIdentifierResolverWithFallback(
    defaultResolver,
    sandboxResolver,
  );
  const resolvedId = await backendIdResolver.resolveDeployedBackendIdentifier({
    appId: 'hello',
    branch: 'world',
  });
  assert.deepEqual(resolvedId, {
    namespace: 'hello',
    name: 'world',
    type: 'branch',
  });
  
  // Verify that the app ID validator was called
  assert.equal(mockAppIdValidator.validateAppId.mock.callCount(), 1);
  assert.deepEqual(mockAppIdValidator.validateAppId.mock.calls[0].arguments, ['hello']);
});

void it('uses the sandbox id if the default identifier resolver fails and there is no stack, appId or branch in args', async () => {
  const appName = 'testAppName';
  const namespaceResolver = {
    resolve: () => Promise.resolve(appName),
  };

  const defaultResolver = new AppBackendIdentifierResolver(namespaceResolver);
  const username = 'test-user';
  const sandboxResolver = new SandboxBackendIdResolver(
    namespaceResolver,
    () =>
      ({
        username,
      }) as never,
  );
  const backendIdResolver = new BackendIdentifierResolverWithFallback(
    defaultResolver,
    sandboxResolver,
  );
  const resolvedId = await backendIdResolver.resolveDeployedBackendIdentifier(
    {},
  );
  assert.deepEqual(resolvedId, {
    namespace: appName,
    type: 'sandbox',
    name: 'test-user',
  });
});

void it('does not use sandbox id if the default identifier resolver fails and there is stack, appId or branch in args', async () => {
  const appName = 'testAppName';
  const namespaceResolver = {
    resolve: () => Promise.resolve(appName),
  };

  const defaultResolver = new AppBackendIdentifierResolver(namespaceResolver);
  const username = 'test-user';
  const sandboxResolver = new SandboxBackendIdResolver(
    namespaceResolver,
    () =>
      ({
        username,
      }) as never,
  );
  const backendIdResolver = new BackendIdentifierResolverWithFallback(
    defaultResolver,
    sandboxResolver,
  );
  const resolvedId = await backendIdResolver.resolveDeployedBackendIdentifier({
    appId: 'testAppName',
  });
  assert.deepEqual(resolvedId, undefined);
});

// stack, appId and branch can be empty string if option is added to command but no value is present (eg. 'ampx generate outputs --stack')
// this shows intent for deployed backend id so we should not fallback to sandbox id
void it('does not use sandbox id if the default identifier resolver fails and stack, appId or branch are empty strings', async () => {
  const appName = 'testAppName';
  const namespaceResolver = {
    resolve: () => Promise.resolve(appName),
  };

  const defaultResolver = new AppBackendIdentifierResolver(namespaceResolver);
  const username = 'test-user';
  const sandboxResolver = new SandboxBackendIdResolver(
    namespaceResolver,
    () =>
      ({
        username,
      }) as never,
  );
  const backendIdResolver = new BackendIdentifierResolverWithFallback(
    defaultResolver,
    sandboxResolver,
  );
  const resolvedId = await backendIdResolver.resolveDeployedBackendIdentifier({
    stack: '',
  });
  assert.deepEqual(resolvedId, undefined);
});
