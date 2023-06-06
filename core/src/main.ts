import * as core from '@actions/core';
import * as github from '@actions/github';
import {createPublicReleaseOnGithub} from './createPublicReleaseOnGithub';
import {SkipActionError} from './types';
import {prepare} from './prepare';
import postGithubRelease from './postGithubRelease';

async function run(): Promise<void> {
  try {
    const payload = github.context.payload;
    core.debug(`Payload: ${JSON.stringify(payload)}`);

    switch (payload.action) {
      case 'opened':
      case 'reopened':
        return prepare(payload);

      case 'closed':
        return createPublicReleaseOnGithub(payload);

      case 'released':
      case 'prereleased':
        return postGithubRelease(payload);
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
