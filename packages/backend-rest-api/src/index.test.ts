import { describe, it } from 'node:test';
import { defineRestApi } from './factory.js';
import assert from 'node:assert';

describe('defineRestApi', () => {
  it('should return a ConstructFactory', () => {
    const restApi = defineRestApi({
      name: 'test-api',
    });
    
    assert.strictEqual(typeof restApi.getInstance, 'function');
    assert.strictEqual(restApi.provides, 'RestApiResources');
  });
});