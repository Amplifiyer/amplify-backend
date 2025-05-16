# Description

This package contains the `defineStorage` entry point for customers to define storage in their Amplify backend.
This is an abstraction on top of `cdk.Bucket`.

## Custom Authorization for Storage

You can define custom lambda authorizers for storage to implement custom access control logic for your S3 buckets. This allows you to define custom logic for each S3 prefix or path to determine whether to grant access to a specific user based on your business logic.

### Example Usage

```typescript
// amplify/functions/storage-authorizer/resource.ts
import { defineFunction } from '@aws-amplify/backend';

export const authorizerHandler = defineFunction({
  name: 'storageAuthorizer',
  entry: './handler.ts',
});

// amplify/functions/storage-authorizer/handler.ts
export const handler = async (event: any) => {
  console.log('Storage authorization event:', JSON.stringify(event, null, 2));
  
  // Extract information from the event
  const { identity, path, operation } = event;
  
  // Implement your custom authorization logic here
  // For example, check if the user has access to the specific path
  
  // Example: Allow access to users' own folders
  if (path.startsWith(`users/${identity.username}/`) && 
      (operation === 'read' || operation === 'write')) {
    return {
      isAuthorized: true,
      context: {
        additionalInfo: 'User accessing their own folder'
      }
    };
  }
  
  // Example: Allow read access to public folder for all users
  if (path.startsWith('public/') && operation === 'read') {
    return {
      isAuthorized: true
    };
  }
  
  // Deny access by default
  return {
    isAuthorized: false,
    denyMessage: 'You do not have permission to access this resource'
  };
};

// amplify/storage/resource.ts
import { defineStorage } from '@aws-amplify/backend-storage';
import { authorizerHandler } from '../functions/storage-authorizer/resource';

export const storage = defineStorage({
  name: 'content',
  authorizer: {
    function: authorizerHandler,
    timeToLiveInSeconds: 300 // Cache authorization decisions for 5 minutes
  }
});
```

### Authorization Event Structure

The Lambda authorizer receives an event with the following structure:

```typescript
interface StorageAuthorizerEvent {
  // The identity of the requester
  identity: {
    username: string;
    identityId: string;
    claims: Record<string, any>; // User claims from tokens
  };
  // The storage path being accessed
  path: string;
  // The operation being performed (read, write, delete)
  operation: 'read' | 'write' | 'delete';
  // Additional context
  context: Record<string, any>;
}
```

### Authorization Response Structure

The Lambda authorizer should return a response with the following structure:

```typescript
interface StorageAuthorizerResponse {
  // Whether the request is authorized
  isAuthorized: boolean;
  // Optional message when access is denied
  denyMessage?: string;
  // Optional context to include with the authorization
  context?: Record<string, any>;
}
```

### Security Considerations

When implementing custom authorizers, consider the following security best practices:

1. Always implement the principle of least privilege
2. Validate all inputs from the event
3. Implement proper error handling
4. Use timeouts to prevent long-running authorizers
5. Consider caching authorization decisions for performance
6. Log authorization decisions for audit purposes
7. Implement rate limiting to prevent abuse
