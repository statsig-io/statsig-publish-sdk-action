import {WebhookPayload} from '@actions/github/lib/interfaces';
import {SkipActionError} from './types';
import {execSync} from 'child_process';
import {SimpleGit, simpleGit} from 'simple-git';

async function runNpmInstall(pullRequest: WebhookPayload['pull_request']) {
  if (!pullRequest?.head?.ref) {
    throw new Error('Failed to get head.ref from payload');
  }

  execSync('npm install', {cwd: process.cwd()});

  const git: SimpleGit = simpleGit({baseDir: process.cwd(), binary: 'git'});
  await git
    .add('./*')
    .commit('files changed')
    .push('origin', pullRequest.head.ref);
}

export async function prepare(payload: WebhookPayload) {
  console.log(`Got Payload: ${JSON.stringify(payload)}`);

  if (!payload.repository) {
    throw new Error('Failed to load repository information');
  }

  if (!payload.pull_request) {
    throw new Error('Failed to load pull_request information');
  }

  switch (payload.repository?.name) {
    case 'test-sdk-repo-private':
      return runNpmInstall(payload.pull_request);

    default:
      throw new SkipActionError(
        `Prepare not supported for repository: ${
          payload.repository?.name ?? null
        }`
      );
  }
}
