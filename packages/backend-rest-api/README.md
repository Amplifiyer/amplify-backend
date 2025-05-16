# @aws-amplify/backend-rest-api

This package provides the REST API construct for Amplify Gen2.

## Installation

```bash
npm install @aws-amplify/backend-rest-api
```

## Usage

```typescript
import { defineRestApi } from '@aws-amplify/backend-rest-api';
import { defineFunction } from '@aws-amplify/backend-function';
import { defineAuth } from '@aws-amplify/backend-auth';

const auth = defineAuth({
  // auth configuration
});

const getItemsFunction = defineFunction({
  entry: './get-items.ts'
});

const restApi = defineRestApi({
  routes: [
    {
      path: '/items',
      methods: ['GET'],
      integration: getItemsFunction
    }
  ],
  auth: {
    authenticatedRoutes: ['/items']
  }
});
```

## License

This library is licensed under the Apache 2.0 License.