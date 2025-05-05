# Custom Authorization for Amplify Storage

This feature allows you to define custom authorization logic for Amplify Storage using a Lambda function authorizer.

## Use Case

Custom authorization for storage is useful when you need more fine-grained control over who can access specific objects in your storage bucket. For example:

- Social app where photos/videos can be private, public, or friends-only
- File sharing app where files can be shared with specific users or groups
- Content management system where access depends on user roles and permissions

## How to Use

### 1. Define a Custom Storage Authorizer

Create an authorizer function that will handle your authorization logic:

```typescript
// auth/storage-authorizer.ts
export const handler = async (event) => {
  const { operation, key, identity } = event;
  
  // Example: Allow access to public/ for everyone
  if (key.startsWith('public/')) {
    return { isAuthorized: true };
  }
  
  // Example: Allow access to users/{userId}/* only for that user
  if (identity.userSub && key.startsWith(`users/${identity.userSub}/`)) {
    return { isAuthorized: true };
  }
  
  // Example: For a social app, check if the user is a friend of the content owner
  if (key.startsWith('friends-only/')) {
    // Check friendship logic here
    const isFriend = await checkFriendship(identity.userSub, ownerId);
    if (isFriend) {
      return { isAuthorized: true };
    }
  }
  
  return { isAuthorized: false };
};
```

### 2. Configure Storage with the Custom Authorizer

```typescript
// amplify/backend.ts
import { defineBackend } from '@aws-amplify/backend';
import { defineFunction } from '@aws-amplify/backend-function';
import { defineStorage } from '@aws-amplify/backend-storage';

const storageAuthorizerFn = defineFunction({
  entry: './auth/storage-authorizer.ts'
});

export const storage = defineStorage({
  name: 'mystorage',
  
  // Add custom authorizer
  customAuthorizer: {
    function: storageAuthorizerFn,
    // Optional: limit to specific paths
    paths: ['private/*', 'friends-only/*']
  }
});

export const backend = defineBackend({
  storage
});
```

### 3. Use in Your Application

The storage client automatically handles the authorization process:

```typescript
import { Storage } from 'aws-amplify';

// Upload a file
await Storage.put('friends-only/photo.jpg', file);

// Get a file - authorization happens behind the scenes
const result = await Storage.get('friends-only/photo.jpg');
```

## Authorization Event Format

Your Lambda function will receive events with this structure:

```typescript
type StorageAuthorizerEvent = {
  // The S3 operation being performed (get, put, delete, list)
  operation: 'get' | 'put' | 'delete' | 'list';
  // The S3 key (path) being accessed
  key: string;
  // The identity of the user making the request
  identity?: {
    // The Cognito identity ID if available
    cognitoIdentityId?: string;
    // The user sub from JWT if authenticated
    userSub?: string;
  };
  // Additional context about the request
  context?: Record<string, any>;
};
```

## Response Format

Your function should return a response with this structure:

```typescript
type StorageAuthorizerResponse = {
  // Whether the operation is allowed
  isAuthorized: boolean;
  // Optional expiration time for the authorization in seconds
  expiration?: number;
  // Optional error message if not authorized
  errorMessage?: string;
  // Optional additional context to add to the response
  responseContext?: Record<string, any>;
};
```

## Best Practices

1. Keep your authorizer function lightweight and fast to minimize latency
2. Add appropriate error handling and logging
3. Use IAM policies for coarse-grained access control and the custom authorizer for fine-grained control
4. Consider caching authorization decisions for frequently accessed objects
5. Organize your storage paths logically to simplify authorization logic