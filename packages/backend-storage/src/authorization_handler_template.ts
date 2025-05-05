/**
 * This is a template for the custom storage authorization handler.
 * This can be used as a reference for implementing custom authorization logic.
 */

// Event structure for the custom storage authorizer
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

// Response structure from the custom authorization handler
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

/**
 * Sample custom authorization handler for Amplify Storage
 * 
 * This function will be invoked to determine if a storage operation is allowed.
 * 
 * @param event The event containing details about the storage operation
 * @returns An authorization response indicating if the operation is allowed
 */
export const handler = async (event: StorageAuthorizerEvent): Promise<StorageAuthorizerResponse> => {
  console.log('Storage authorization event:', JSON.stringify(event, null, 2));
  
  // Get the operation and path
  const { operation, key } = event;
  
  // Get user identity if available
  const identityId = event.identity?.cognitoIdentityId;
  const userSub = event.identity?.userSub;
  
  // Example: Allow access to public/* for everyone
  if (key.startsWith('public/')) {
    return {
      isAuthorized: true,
    };
  }
  
  // Example: Allow access to users/{userId}/* only for that user
  if (userSub && key.startsWith(`users/${userSub}/`)) {
    return {
      isAuthorized: true,
    };
  }
  
  // Example: For a social app, check if the user is a friend of the content owner
  if (key.startsWith('friends-only/')) {
    // Extract owner ID from the path, e.g., friends-only/user123/photo.jpg
    const parts = key.split('/');
    if (parts.length >= 2) {
      const ownerId = parts[1];
      
      // Here you would typically query a database to check friend relationships
      const isFriend = await checkFriendship(userSub, ownerId);
      
      if (isFriend) {
        return {
          isAuthorized: true,
        };
      }
    }
  }
  
  // Deny by default
  return {
    isAuthorized: false,
    errorMessage: 'You do not have permission to access this resource',
  };
};

/**
 * Mock function to check if two users are friends
 * In a real implementation, this would query a database
 */
async function checkFriendship(userA?: string, userB?: string): Promise<boolean> {
  if (!userA || !userB) return false;
  
  // In a real implementation, you would query your database
  // For example:
  // const result = await dynamoDb.get({
  //   TableName: 'FriendsTable',
  //   Key: {
  //     userId: userA,
  //     friendId: userB
  //   }
  // }).promise();
  // return !!result.Item;
  
  // For demo purposes just return true for specific test users
  return (userA === 'user1' && userB === 'user2') || 
         (userA === 'user2' && userB === 'user1');
}