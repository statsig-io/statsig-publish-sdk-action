import * as core from '@actions/core';
import * as github from '@actions/github';
import {release} from './release';
import {SkipActionError} from './types';
import {prepare} from './prepare';

/**
 * See also: test-sdk-repo-private and test-sdk-repo-public.
 */

async function run(): Promise<void> {
  try {
    const payload = github.context.payload;
    core.debug(`Payload: ${JSON.stringify(payload)}`);

    switch (payload.action) {
      case 'opened':
      case 'reopened':
        return await prepare(payload);

      case 'closed':
        return await release(payload);
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
