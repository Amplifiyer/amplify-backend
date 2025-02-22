## API Report File for "@aws-amplify/backend-output-storage"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts

/// <reference types="node" />

import { BackendOutputEntry } from '@aws-amplify/plugin-types';
import { BackendOutputStorageStrategy } from '@aws-amplify/plugin-types';
import * as _fs from 'fs';
import * as _os from 'os';
import { Stack } from 'aws-cdk-lib';

// @public (undocumented)
export type AttributionMetadata = {
    createdOn: Platform;
    createdBy: DeploymentEngineType;
    createdWith: string;
    stackType: string;
    metadata: Record<string, string>;
};

// @public
export class AttributionMetadataStorage {
    constructor(fs?: typeof _fs, os?: typeof _os);
    storeAttributionMetadata: (stack: Stack, stackType: string, libraryPackageJsonAbsolutePath: string, additionalMetadata?: Record<string, string>) => void;
}

// @public (undocumented)
export type DeploymentEngineType = 'AmplifyPipelineDeploy' | 'AmplifySandbox' | 'AmplifyCDK';

// @public (undocumented)
export type Platform = 'Mac' | 'Windows' | 'Linux' | 'Other';

// @public
export class StackMetadataBackendOutputStorageStrategy implements BackendOutputStorageStrategy<BackendOutputEntry> {
    constructor(stack: Stack);
    addBackendOutputEntry: (keyName: string, backendOutputEntry: BackendOutputEntry) => void;
}

// (No @packageDocumentation comment for this package)

```
