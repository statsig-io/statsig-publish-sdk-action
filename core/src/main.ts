import * as core from '@actions/core';
import * as github from '@actions/github';
import { syncReposAndCreateRelease } from './release';
import { SkipActionError } from './types';
import { prepareForRelease } from './prepare';
import { pushReleaseToThirdParties } from './post_release';
import packageJson from '../package.json';

/**
 * See also: test-sdk-repo-private and test-sdk-repo-public.
 */

async function run(): Promise<void> {
  try {
    const payload = github.context.payload;
    core.debug(`Payload: ${JSON.stringify(payload)}`);
    core.debug(
      `statsig-io/statsig-publish-sdk-action version: ${packageJson.version}`
    );

    if (payload.pull_request) {
      switch (payload.action) {
        case 'opened':
        case 'reopened':
          return await prepareForRelease(payload);

        case 'closed':
          return await syncReposAndCreateRelease(payload);

        default:
          console.warn(
            `Action '${payload.action}' not supported for 'pull_request' event`
          );
          return;
      }
    }

    if (payload.release) {
      switch (payload.action) {
        case 'released':
        case 'prereleased':
          return await pushReleaseToThirdParties(payload);

        case 'edited':
          console.log('On Edited');
          return;

        default:
          console.warn(
            `Action '${payload.action}' not supported for 'release' event`
          );
          return;
      }
    }
  } catch (error) {
    if (error instanceof SkipActionError) {
      console.log(`Skipped: ${error.message}`);
      return;
    }

    if (error instanceof Error) {
      console.error(error);
      core.setFailed(error.message);
    }
  }
}

run();
