import { describe, it } from 'node:test';
import { BackendIdentifierMainStackNameResolver } from './backend_identifier_main_stack_name_resolver.js';
import assert from 'node:assert';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';

void describe('BackendIdentifierMainStackNameResolver', () => {
  void describe('resolveMainStackName', () => {
    const backendId: BackendIdentifier = {
      namespace: 'testBackendId',
      name: 'testBranchName',
      type: 'branch',
    };

    void it('returns value of getMainStackName', async () => {
      const stackNameResolver = new BackendIdentifierMainStackNameResolver(
        backendId,
      );

      const result = await stackNameResolver.resolveMainStackName();
      assert.equal(
        result,
        'amplify-testBackendId-testBranchName-branch-e482a1c36f',
      );
    });

    void it('uses BackendIdentifierConversions.toStackName to convert backend ID to stack name', async () => {
      const stackNameResolver = new BackendIdentifierMainStackNameResolver(
        backendId,
      );

      const result = await stackNameResolver.resolveMainStackName();
      const expectedStackName = BackendIdentifierConversions.toStackName(backendId);
      
      assert.equal(result, expectedStackName);
    });

    void it('handles sandbox type correctly', async () => {
      const sandboxBackendId: BackendIdentifier = {
        namespace: 'testBackendId',
        name: 'testSandboxName',
        type: 'sandbox',
      };
      
      const stackNameResolver = new BackendIdentifierMainStackNameResolver(
        sandboxBackendId,
      );

      const result = await stackNameResolver.resolveMainStackName();
      const expectedStackName = BackendIdentifierConversions.toStackName(sandboxBackendId);
      
      assert.equal(result, expectedStackName);
    });

    void it('handles backend IDs with hash correctly', async () => {
      const backendIdWithHash: BackendIdentifier = {
        namespace: 'testBackendId',
        name: 'testBranchName',
        type: 'branch',
        hash: 'customHash',
      };
      
      const stackNameResolver = new BackendIdentifierMainStackNameResolver(
        backendIdWithHash,
      );

      const result = await stackNameResolver.resolveMainStackName();
      const expectedStackName = BackendIdentifierConversions.toStackName(backendIdWithHash);
      
      assert.equal(result, expectedStackName);
      assert(result.endsWith('-customHash'));
    });
  });
});
