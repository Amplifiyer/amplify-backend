/**
 * Example file showing how a client would use the custom storage authorizer
 * This is not part of the actual implementation, just a reference example
 */

import { defineBackend } from '@aws-amplify/backend';
import { defineFunction } from '@aws-amplify/backend-function';
import { defineStorage } from '@aws-amplify/backend-storage';

// Define the storage authorizer function
const storageAuthorizerFn = defineFunction({
  // Point to your authorizer implementation
  entry: './auth/storage-authorizer.ts'
});

// Define storage with the custom authorizer
export const storage = defineStorage({
  name: 'mystorage',
  
  // Configure the custom authorizer
  customAuthorizer: {
    function: storageAuthorizerFn,
    
    // Optional: specify paths this authorizer applies to
    paths: [
      'private/*',
      'friends-only/*'
    ]
  },
  
  // You can still use the standard access controls alongside the custom authorizer
  access: (allow) => ({
    // Standard public access
    'public/*': [
      allow.authenticated.to(['read', 'write']),
      allow.unauthenticated.to(['read'])
    ],
    
    // Custom authorized paths can also have basic access rules
    // The custom authorizer will apply additional checks at runtime
    'private/*': [
      allow.authenticated.to(['read', 'write'])
    ],
    'friends-only/*': [
      allow.authenticated.to(['read'])
    ]
  })
});

// Include the storage in your backend definition
export const backend = defineBackend({
  storage
});