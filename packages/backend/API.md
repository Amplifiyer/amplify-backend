## API Report File for "@aws-amplify/backend"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts

import { a } from '@aws-amplify/data-schema';
import { BackendSecret } from '@aws-amplify/plugin-types';
import { ClientSchema } from '@aws-amplify/data-schema';
import { Construct } from 'constructs';
import { ConstructFactory } from '@aws-amplify/plugin-types';
import { defineAuth } from '@aws-amplify/backend-auth';
import { defineData } from '@aws-amplify/backend-data';
import { defineStorage } from '@aws-amplify/backend-storage';
import { Func } from '@aws-amplify/backend-function';
import { Stack } from 'aws-cdk-lib';

export { a }

// @public
export type Backend<T extends Record<string, ConstructFactory<Construct>>> = {
    getStack: (name: string) => Stack;
    readonly resources: {
        [K in keyof T]: ReturnType<T[K]['getInstance']>;
    };
};

export { ClientSchema }

export { defineAuth }

// @public
export const defineBackend: <T extends Record<string, ConstructFactory<Construct>>>(constructFactories: T) => Backend<T>;

export { defineData }

export { defineStorage }

export { Func }

// @public
export const secret: (name: string) => BackendSecret;

// (No @packageDocumentation comment for this package)

```
