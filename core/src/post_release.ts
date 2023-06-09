import * as core from '@actions/core';

import {WebhookPayload} from '@actions/github/lib/interfaces';
import {execSync} from 'child_process';
import {SkipActionError} from './types';
import {SimpleGit, simpleGit} from 'simple-git';
import {createGitRepoUrl} from './helpers';

type ActionArgs = {
  tag: string;
  repo: string;
  token: string;
  workingDir: string;
};

export async function postRelease(payload: WebhookPayload) {
  const args = validateAndExtractArgsFromPayload(payload);
  const action = getPostReleaseAction(args.repo);
  await cloneRepo(args);
  await action(args);
}

function getPostReleaseAction(repo: string) {
  switch (repo) {
    case 'test-sdk-repo-public':
    case 'js-client':
    case 'node-js-server-sdk':
      return runNpmPublish;

    default:
      throw new SkipActionError(
        `Release not supported for repository: ${repo ?? null}`
      );
  }
}

function validateAndExtractArgsFromPayload(
  payload: WebhookPayload
): ActionArgs {
  const name = payload.repository?.name;
  const tag = payload.release?.tag_name;

  if (typeof name !== 'string' || typeof tag !== 'string') {
    throw new Error('Unable to load repository info');
  }

  const token = core.getInput('gh-token');

  return {
    tag,
    repo: name,
    token,
    workingDir: process.cwd() + '/public-sdk'
  };
}

async function cloneRepo(args: ActionArgs) {
  const git: SimpleGit = simpleGit();

  await git.clone(createGitRepoUrl(args.token, args.repo), args.workingDir, {
    '--depth': 1,
    '--branch': args.tag
  });
}

async function runNpmPublish(args: ActionArgs) {
  const NPM_TOKEN = core.getInput('npm-token') ?? '';
  if (NPM_TOKEN === '') {
    throw new Error('Call to NPM Publish without settng npm-token');
  }

  const result = execSync(
    `npm install && npm config set //registry.npmjs.org/:_authToken ${NPM_TOKEN} && npm publish`,
    {
      cwd: args.workingDir,
      env: {...process.env, NPM_TOKEN, NPM_AUTH_TOKEN: NPM_TOKEN}
    }
  );

  console.log(`Published: ${JSON.stringify(result.toString())}`);
}
