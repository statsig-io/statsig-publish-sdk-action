import * as core from '@actions/core';

import {WebhookPayload} from '@actions/github/lib/interfaces';
import {execSync} from 'child_process';
import {SkipActionError} from './types';

export async function postRelease(payload: WebhookPayload) {
  const workingDir = process.cwd() + '/private-sdk';

  const action = getPostReleaseAction(payload);
  await action(workingDir);
}

function getPostReleaseAction(payload: WebhookPayload) {
  switch (payload.repository?.name) {
    case 'test-sdk-repo-private':
    case 'private-js-client-sdk':
    case 'private-node-js-server-sdk':
      return runNpmPublish;

    case 'ios-client-sdk':
      return noop;

    default:
      throw new SkipActionError(
        `Release not supported for repository: ${
          payload.repository?.name ?? null
        }`
      );
  }
}

async function runNpmPublish(dir: string) {
  const NPM_TOKEN = core.getInput('npm-token') ?? '';
  if (NPM_TOKEN === '') {
    throw new Error('Call to NPM Publish without settng npm-token');
  }

  const result = execSync(
    `npm install && npm config set //registry.npmjs.org/:_authToken ${NPM_TOKEN} && npm publish`,
    {
      cwd: dir,
      env: {...process.env, NPM_TOKEN, NPM_AUTH_TOKEN: NPM_TOKEN}
    }
  );

  console.log(`Published: ${JSON.stringify(result.toString())}`);
}

async function noop() {}
