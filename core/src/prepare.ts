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
    .then(() =>
      git
        .cwd(dir)
        .addConfig('user.name', 'statsig-kong[bot]')
        .addConfig('user.email', 'statsig-kong[bot]@users.noreply.github.com')
    )
    .then(() => git.checkout(branch));

  execSync('npm install', {cwd: dir});

  await git.status().then(status => {
    if (status.isClean()) {
      return;
    }

    const supported = ['package-lock.json', 'src/SDKVersion.ts'];
    const files = status.files
      .filter(file => supported.includes(file.path))
      .map(file => file.path);

    return git
      .add(files)
      .then(() => git.commit(`Bot: Updated File/s [${files.join(', ')}]`))
      .then(() => git.push('origin', branch));
  });
}

export async function prepare(payload: WebhookPayload) {
  if (!payload.repository) {
    throw new Error('Failed to load repository information');
  }

  if (!payload.pull_request) {
    throw new Error('Failed to load pull_request information');
  }

  switch (payload.repository?.name) {
    case 'test-sdk-repo-private':
    case 'private-js-client-sdk':
    case 'private-node-js-server-sdk':
      return runNpmInstall(payload);

    default:
      throw new SkipActionError(
        `Core.prepare not supported for repository: ${
          payload.repository?.name ?? null
        }`
      );
  }
}
