import { afterEach, before, beforeEach, describe, it } from 'node:test';
import fs from 'fs/promises';
import path from 'path';
import os, { userInfo } from 'os';
import { execa } from 'execa';
import { ampxCli } from '../process-controller/process_controller.js';
import { TestBranch, amplifyAppPool } from '../amplify_app_pool.js';
import assert from 'node:assert';
import { existsSync } from 'fs';
import {
  CloudFormationClient,
  DeleteStackCommand,
} from '@aws-sdk/client-cloudformation';
import {
  confirmDeleteSandbox,
  interruptSandbox,
  replaceFiles,
  waitForSandboxDeploymentToPrintTotalTime,
  waitForSandboxToBeginHotswappingResources,
} from '../process-controller/predicated_action_macros.js';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
import { amplifyAtTag } from '../constants.js';
import { FunctionCodeHotswapTestProjectCreator } from '../test-project-setup/live-dependency-health-checks-projects/function_code_hotswap.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import {
  NoticesManifestValidator,
  noticesManifestSchema,
} from '@aws-amplify/cli-core';

const cfnClient = new CloudFormationClient(e2eToolingClientConfig);

/**
 * These tests primary focus is a validation than our released artifacts
 * are working and catch potential problems with dependencies and
 * underlying services that we talk to.
 *
 * These tests intentionally do not use local npm registry (verdaccio).
 */
void describe('Live dependency health checks', { concurrency: true }, () => {
  before(async () => {
    // Nuke the npx cache to ensure we are installing latest versions of packages from the npm.
    const { stdout } = await execa('npm', ['config', 'get', 'cache']);
    const npxCacheLocation = path.join(stdout.toString().trim(), '_npx');

    if (existsSync(npxCacheLocation)) {
      await fs.rm(npxCacheLocation, { recursive: true });
    }

    // Force 'create-amplify' installation in npx cache by executing help command
    // before tests run. Otherwise, installing 'create-amplify' concurrently
    // may lead to race conditions and corrupted npx cache.
    await execa('npm', ['create', amplifyAtTag, '--yes', '--', '--help'], {
      // Command must run outside of 'amplify-backend' workspace.
      cwd: os.homedir(),
      stdio: 'inherit',
    });
  });

  void describe('pipeline deployment', () => {
    let tempDir: string;
    let testBranch: TestBranch;
    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-amplify'));
      testBranch = await amplifyAppPool.createTestBranch();
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true });
      const stackName = BackendIdentifierConversions.toStackName({
        namespace: testBranch.appId,
        name: testBranch.branchName,
        type: 'branch',
      });
      try {
        await cfnClient.send(
          new DeleteStackCommand({
            StackName: stackName,
          }),
        );
      } catch (e) {
        console.log(`Failed to delete ${stackName}`);
        console.log(e);
      }
    });

    void it('end to end flow', async () => {
      await execa('npm', ['create', amplifyAtTag, '--yes'], {
        cwd: tempDir,
        stdio: 'inherit',
      });

      await ampxCli(
        [
          'pipeline-deploy',
          '--branch',
          testBranch.branchName,
          '--appId',
          testBranch.appId,
        ],
        tempDir,
        {
          env: { CI: 'true' },
        },
      ).run();

      const clientConfigStats = await fs.stat(
        path.join(tempDir, 'amplify_outputs.json'),
      );
      assert.ok(clientConfigStats.isFile());
    });
  });

  void describe('sandbox deployment', () => {
    let tempDir: string;
    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-amplify'));
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true });
    });

    void it('end to end flow', async () => {
      await execa('npm', ['create', amplifyAtTag, '--yes'], {
        cwd: tempDir,
        stdio: 'inherit',
      });

      await ampxCli(['sandbox'], tempDir)
        .do(waitForSandboxDeploymentToPrintTotalTime())
        .do(interruptSandbox())
        .run();

      const clientConfigStats = await fs.stat(
        path.join(tempDir, 'amplify_outputs.json'),
      );
      assert.ok(clientConfigStats.isFile());

      await ampxCli(['sandbox', 'delete'], tempDir)
        .do(confirmDeleteSandbox())
        .run();
    });
  });

  void describe('sandbox hotswap', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-amplify'));
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true });
    });

    void it('can hotswap function code', async () => {
      const projectCreator = new FunctionCodeHotswapTestProjectCreator();
      const testProject = await projectCreator.createProject(tempDir);

      const sandboxBackendIdentifier: BackendIdentifier = {
        type: 'sandbox',
        namespace: testProject.name,
        name: userInfo().username,
      };

      await testProject.deploy(sandboxBackendIdentifier);

      const processController = ampxCli(
        ['sandbox', '--dirToWatch', 'amplify'],
        testProject.projectDirPath,
      );
      const updates = await testProject.getUpdates();
      for (const update of updates) {
        processController
          .do(replaceFiles(update.replacements))
          .do(waitForSandboxToBeginHotswappingResources())
          .do(waitForSandboxDeploymentToPrintTotalTime());
      }

      // Execute the process.
      await processController.do(interruptSandbox()).run();

      // Clean up
      await testProject.tearDown(sandboxBackendIdentifier);
    });
  });

  void describe('notices website', () => {
    void it('returns valid notices manifest', async () => {
      const response = await fetch(
        'https://notices.cli.amplify.aws/notices.json',
      );
      const manifest = noticesManifestSchema.parse(await response.json());
      assert.ok(new NoticesManifestValidator().validate(manifest));
    });
  });
});
