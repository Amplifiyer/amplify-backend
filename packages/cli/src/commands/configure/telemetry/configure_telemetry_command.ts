import {
  ConfigurationController,
  TELEMETRY_ENABLED,
  USAGE_DATA_TRACKING_ENABLED,
} from '@aws-amplify/platform-core';
import { Argv, CommandModule } from 'yargs';
import { printer } from '@aws-amplify/cli-core';
/**
 * Command to configure AWS Amplify profile.
 */
export class ConfigureTelemetryCommand implements CommandModule<object> {
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  /**
   * Configure profile command.
   */
  constructor(private readonly configController: ConfigurationController) {
    this.command = 'telemetry';
    this.describe = 'Configure anonymous usage data collection';
  }

  /**
   * @inheritDoc
   */
  handler = () => {
    // CommandModule requires handler implementation. But this is never called if top level command
    // is configured to require subcommand.
    // Help is printed by default in that case before ever attempting to call handler.
    throw new Error('Top level generate handler should never be called');
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv) => {
    return yargs
      .command('enable', 'Enable anonymous data collection', {}, async () => {
        await this.configController.set(USAGE_DATA_TRACKING_ENABLED, true);
        await this.configController.set(TELEMETRY_ENABLED, true);
        printer.log('You have enabled telemetry data collection');
      })
      .command('disable', 'Disable anonymous data collection', {}, async () => {
        await this.configController.set(USAGE_DATA_TRACKING_ENABLED, false);
        await this.configController.set(TELEMETRY_ENABLED, false);
        printer.log('You have disabled telemetry data collection');
      })
      .demandCommand()
      .strictCommands()
      .recommendCommands();
  };
}
