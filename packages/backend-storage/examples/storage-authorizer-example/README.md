# Storage Custom Authorizer Example

This example demonstrates how to implement a custom authorizer for storage in Amplify Gen 2.

## Files

- `resource.ts` - Defines the Lambda function that will be used as the authorizer
- `handler.ts` - Contains the implementation of the authorizer logic
- `storage-resource.ts` - Shows how to configure storage with the custom authorizer

## Authorization Logic

The example authorizer implements the following rules:

1. Admin users (with "admin" in their Cognito groups) can access any path
2. Users can read/write to their own folders (`users/{username}/*`)
3. Anyone can read from public folders (`public/*`)
4. Team members can access their team folders (`teams/{teamId}/*`) if they belong to that team
5. All other access is denied

## Usage

To use this example in your Amplify Gen 2 project:

1. Create the authorizer function:
   ```
   mkdir -p amplify/functions/storage-authorizer
   cp handler.ts amplify/functions/storage-authorizer/
   ```

2. Create the function resource:
   ```
   cp resource.ts amplify/functions/storage-authorizer/resource.ts
   ```

3. Configure your storage with the authorizer:
   ```
   cp storage-resource.ts amplify/storage/resource.ts
   ```

4. Deploy your backend:
   ```
   npx ampx deploy
   ```

## Security Considerations

When implementing custom authorizers, consider the following security best practices:

1. Always implement the principle of least privilege
2. Validate all inputs from the event
3. Implement proper error handling
4. Use timeouts to prevent long-running authorizers
5. Consider caching authorization decisions for performance
6. Log authorization decisions for audit purposes
7. Implement rate limiting to prevent abuse

## Testing

You can test your authorizer by:

1. Deploying the backend
2. Using the Amplify Storage client to perform operations
3. Checking CloudWatch logs to see the authorization decisions
4. Verifying that access is granted or denied according to your rules