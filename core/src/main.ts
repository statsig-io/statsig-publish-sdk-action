import * as core from '@actions/core';
import * as github from '@actions/github';
import {release} from './release';
import {SkipActionError} from './types';
import {prepare} from './prepare';
import {postRelease} from './post_release';

/**
 * See also: test-sdk-repo-private and test-sdk-repo-public.
 */

async function run(): Promise<void> {
  try {
    const payload = github.context.payload;
    core.debug(`Payload: ${JSON.stringify(payload)}`);

    const event = !!payload.pull_request
      ? 'pull_request'
      : !!payload.release
      ? 'release'
      : 'unknown';

    switch (`${event}:${payload.action}`) {
      case 'pull_request:opened':
      case 'pull_request:reopened':
        return await prepare(payload);

      case 'pull_request:closed':
        return await release(payload);

      case 'release:released':
      case 'release:prereleased':
        return await postRelease(payload);

      case 'edited':
        console.log('On Edited');
        return;
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
