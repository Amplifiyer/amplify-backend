import { configControllerFactory } from '../config/local_configuration_controller_factory.js';
import { NoOpUsageDataEmitter } from './noop_usage_data_emitter.js';
import { DefaultUsageDataEmitter } from './usage_data_emitter.js';
import { USAGE_DATA_TRACKING_ENABLED } from './constants.js';
import { AmplifyError } from '../index.js';
import { Dependency } from '@aws-amplify/plugin-types';

export type UsageDataEmitter = {
  emitSuccess: (
    metrics?: Record<string, number>,
    dimensions?: Record<string, string>,
  ) => Promise<void>;
  emitFailure: (
    error: AmplifyError,
    dimensions?: Record<string, string>,
  ) => Promise<void>;
};

/**
 * Creates UsageDataEmitter for a given library version
 */
export class UsageDataEmitterFactory {
  /**
   * Creates UsageDataEmitter for a given library version, usage data tracking preferences
   */
  getInstance = async (
    libraryVersion: string,
    dependencies?: Array<Dependency>,
  ): Promise<UsageDataEmitter> => {
    const configController = configControllerFactory.getInstance(
      'usage_data_preferences.json',
    );

    const usageDataTrackingDisabledLocalFile =
      (await configController.get<boolean>(USAGE_DATA_TRACKING_ENABLED)) ===
      false;

    if (
      process.env.AMPLIFY_DISABLE_TELEMETRY ||
      usageDataTrackingDisabledLocalFile
    ) {
      return new NoOpUsageDataEmitter();
    }
    return new DefaultUsageDataEmitter(libraryVersion, dependencies);
  };
}
