import {
  BackendOutputStorageStrategy,
  ConstructContainerRouter,
  ConstructFactory,
  ConstructFactoryGetInstanceParams,
} from '@aws-amplify/plugin-types';

import { AmplifyStorage, AmplifyStorageProps } from './construct.js';
import { AmplifyStorageFactoryProps, StorageAccessRecord } from './types.js';
import { StorageAccessOrchestrator } from './storage_access_orchestrator.js';
import { CustomStorageAuthorizer } from './custom_storage_authorizer.js';
import { FunctionResources } from '@aws-amplify/plugin-types';
import { StoragePath } from './types.js';

/**
 * Creates storage instances
 */
export class AmplifyStorageFactory
  implements ConstructFactory<AmplifyStorage> {
  private readonly outputStorageStrategy?: BackendOutputStorageStrategy<unknown>;
  private readonly containerRouterFactory: () => ConstructContainerRouter;

  /**
   * @param outputStorageStrategy - optional explicit output storage strategy
   * @param containerRouterFactory - function that provides a container router
   */
  constructor(
    outputStorageStrategy: BackendOutputStorageStrategy<unknown> | undefined,
    containerRouterFactory: () => ConstructContainerRouter,
  ) {
    this.outputStorageStrategy = outputStorageStrategy;
    this.containerRouterFactory = containerRouterFactory;
  }

  /**
   * Create a storage instance, creating a unique id.
   * The container router is used to create unique ids for storage instances.
   * @param props - storage properties
   */
  create = (props: AmplifyStorageFactoryProps): AmplifyStorage => {
    const containerRouter = this.containerRouterFactory();
    const id = containerRouter.generateConstructId({
      namespace: 'Storage',
      value: props.name,
    });
    const container = containerRouter.getOrCreateContainerFor(id);

    const storage = new AmplifyStorage(container, id, {
      name: props.name,
      versioned: props.versioned,
      isDefault: props.isDefault,
      outputStorageStrategy: this.outputStorageStrategy,
    });

    if (props.access) {
      // Configure access if specified
      const storageAccessDefinitions = new StorageAccessOrchestrator().makeAccessDefinition({
        access: props.access,
        getContainerRouter: this.containerRouterFactory,
      });
      
      const accessDefinitionRecord: StorageAccessRecord = {};
      storageAccessDefinitions.forEach((definition) => {
        definition.accessPaths.forEach((accessPath) => {
          accessDefinitionRecord[accessPath] = definition.accessDefinition;
        });
      });
      storage.addAccessDefinition(accessDefinitionRecord);
    }

    // Create and apply custom authorizer if specified
    if (props.customAuthorizer) {
      const customAuthorizer = new CustomStorageAuthorizer(
        storage,
        props.customAuthorizer.function,
        props.customAuthorizer.paths
      );

      // Apply the custom authorizer to the storage instance
      storage.setCustomAuthorizer(customAuthorizer);
    }

    return storage;
  };

  /**
   * Get an instance of AmplifyStorage that has already been created.
   */
  getInstance = ({
    constructContainer,
    constructId,
  }: ConstructFactoryGetInstanceParams): AmplifyStorage => {
    return constructContainer.node.findChild(constructId) as AmplifyStorage;
  };
}