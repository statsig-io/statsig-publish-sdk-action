import {WebhookPayload} from '@actions/github/lib/interfaces';
import * as core from '@actions/core';
import {SkipActionError} from './types';
import {execSync} from 'child_process';
import {SimpleGit, simpleGit} from 'simple-git';
import {createGitRepoUrl} from './helpers';

async function runNpmInstall(payload: WebhookPayload) {
  const repo = payload.repository?.name;
  const branch = payload.pull_request?.head?.ref;
  if (!repo || !branch) {
    throw new Error('Missing required information');
  }
  const token = core.getInput('gh-token');

  const git: SimpleGit = simpleGit();
  const dir = process.cwd() + '/private-sdk';

  await git
    .clone(createGitRepoUrl(token, repo), dir)
    .cwd(dir)
    .addConfig('user.name', 'statsig-kong[bot]')
    .addConfig('user.email', 'statsig-kong[bot]@users.noreply.github.com')
    .then(() => git.checkout(branch));

  execSync('npm install', {cwd: dir});

  await git.status().then(status => {
    if (status.isClean()) {
      return;
    }

    return git.add('./*').commit('files changed').push('origin', branch);
  });
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
      return runNpmInstall(payload);

    default:
      throw new SkipActionError(
        `Prepare not supported for repository: ${
          payload.repository?.name ?? null
        }`
      );
  }
}
