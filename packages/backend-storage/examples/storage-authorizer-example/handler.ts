/**
 * Example storage authorizer function that demonstrates how to implement
 * custom authorization logic for S3 storage access.
 * 
 * This example implements the following rules:
 * 1. Users can read/write to their own folders (users/{username}/*)
 * 2. Users can read from public folders (public/*)
 * 3. Admin users can access any path
 * 4. All other access is denied
 */

interface StorageAuthorizerEvent {
  identity: {
    username: string;
    identityId: string;
    claims: Record<string, any>;
  };
  path: string;
  operation: 'read' | 'write' | 'delete';
  context: Record<string, any>;
}

interface StorageAuthorizerResponse {
  isAuthorized: boolean;
  denyMessage?: string;
  context?: Record<string, any>;
}

export const handler = async (event: StorageAuthorizerEvent): Promise<StorageAuthorizerResponse> => {
  console.log('Storage authorization event:', JSON.stringify(event, null, 2));
  
  try {
    const { identity, path, operation } = event;
    
    // Check if user is an admin (has admin group in cognito:groups claim)
    const isAdmin = identity.claims['cognito:groups']?.includes('admin');
    
    // Admin users can access any path
    if (isAdmin) {
      return {
        isAuthorized: true,
        context: {
          reason: 'Admin access',
          username: identity.username
        }
      };
    }
    
    // Users can access their own folders
    if (path.startsWith(`users/${identity.username}/`)) {
      return {
        isAuthorized: true,
        context: {
          reason: 'User accessing own folder',
          username: identity.username
        }
      };
    }
    
    // Anyone can read from public folders
    if (path.startsWith('public/') && operation === 'read') {
      return {
        isAuthorized: true,
        context: {
          reason: 'Public read access',
          username: identity.username
        }
      };
    }
    
    // Specific business logic for team folders
    // Team members can read/write to their team folders
    if (path.startsWith('teams/')) {
      const teamId = path.split('/')[1]; // Extract team ID from path
      
      // Check if user is a member of this team
      // This could be a database lookup or checking claims
      const userTeams = identity.claims['custom:teams']?.split(',') || [];
      
      if (userTeams.includes(teamId)) {
        return {
          isAuthorized: true,
          context: {
            reason: 'Team member access',
            username: identity.username,
            teamId
          }
        };
      }
    }
    
    // Deny access by default
    return {
      isAuthorized: false,
      denyMessage: 'You do not have permission to access this resource'
    };
  } catch (error) {
    console.error('Error in storage authorizer:', error);
    
    // Fail closed - deny access on error
    return {
      isAuthorized: false,
      denyMessage: 'Authorization error occurred'
    };
  }
};