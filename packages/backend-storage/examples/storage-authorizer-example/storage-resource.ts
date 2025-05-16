import { defineStorage } from '@aws-amplify/backend-storage';
import { authorizerHandler } from './resource';

/**
 * Example storage resource with custom authorizer
 * 
 * This demonstrates how to configure a storage resource with a custom
 * lambda authorizer that will be invoked to determine if a user has
 * access to specific storage paths.
 */
export const storage = defineStorage({
  name: 'content',
  
  // Configure the custom authorizer
  authorizer: {
    function: authorizerHandler,
    timeToLiveInSeconds: 300 // Cache authorization decisions for 5 minutes
  },
  
  // You can still use the standard access rules alongside the custom authorizer
  // The custom authorizer will be invoked after the standard access rules are evaluated
  access: (allow) => ({
    'public/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write'])
    ],
    'users/{identity}/*': [
      allow.entity('identity').to(['read', 'write', 'delete'])
    ]
  })
});