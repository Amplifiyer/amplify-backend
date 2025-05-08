# @aws-amplify/backend-rest-api

This package provides REST API support for AWS Amplify Gen2 applications.

## Installation

```bash
npm install @aws-amplify/backend-rest-api
```

## Usage

```typescript
import { defineBackend } from '@aws-amplify/backend';
import { defineRestApi } from '@aws-amplify/backend-rest-api';

const api = defineRestApi({
  routes: {
    '/items': {
      GET: {
        function: myFunction
      },
      POST: {
        function: myFunction
      }
    },
    '/items/{id}': {
      GET: {
        function: myFunction
      },
      PUT: {
        function: myFunction
      },
      DELETE: {
        function: myFunction
      }
    }
  }
});

const backend = defineBackend({
  api
});
```