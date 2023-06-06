import * as core from '@actions/core';

import {WebhookPayload} from '@actions/github/lib/interfaces';
import {SkipActionError} from './types';
import {execSync} from 'child_process';

export default function postGithubRelease(payload: WebhookPayload) {
  switch (payload.repository?.name) {
    case 'test-sdk-repo-private':
    case 'private-js-client-sdk':
    case 'private-node-js-server-sdk':
      return runNpmPublish();

    default:
      throw new SkipActionError(
        `Core.postGithubRelease not supported for repository: ${
          payload.repository?.name ?? null
        }`
      );
  }
}

async function runNpmPublish() {
  const NPM_TOKEN = core.getInput('npm-token') ?? '';
  if (NPM_TOKEN === '') {
    throw new Error('Call to NPM Publish without settng npm-token');
  }

  const result = execSync('npm publish', {
    cwd: process.cwd(),
    env: {...process.env, NPM_TOKEN}
  });

  console.log(`Published: ${JSON.stringify(result.toString())}`);
}
