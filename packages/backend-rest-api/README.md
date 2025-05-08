# @aws-amplify/backend-rest-api

This package provides REST API support for AWS Amplify Gen 2 applications.

## Installation

```bash
npm install @aws-amplify/backend-rest-api
```

## Usage

```typescript
import { defineBackend } from '@aws-amplify/backend';
import { defineRestApi } from '@aws-amplify/backend-rest-api';
import { defineAuth } from '@aws-amplify/backend-auth';

const auth = defineAuth({
  // auth configuration
});

const api = defineRestApi({
  // REST API configuration
});

export const backend = defineBackend({
  auth,
  api
});
```

## Features

1. Define REST APIs for your Amplify Gen 2 application
2. Use Amplify Auth (via `defineAuth`) to authorize requests
3. REST API URL is included in the Amplify outputs file for client configuration

## Documentation

For more information, see the [Amplify Documentation](https://docs.amplify.aws/gen2/build-a-backend/rest-api/).