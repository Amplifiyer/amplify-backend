import { defineFunction } from '@aws-amplify/backend';

export const authorizerHandler = defineFunction({
  name: 'storageAuthorizer',
  entry: './handler.ts',
});