import * as core from '@actions/core';
import { WebhookPayload } from '@actions/github/lib/interfaces';
import { execSync } from 'child_process';
import { SimpleGit, simpleGit } from 'simple-git';
import { createGitRepoUrl } from './helpers';
import { SkipActionError } from './types';

async function runNpmInstall(payload: WebhookPayload) {
  const repo = payload.repository?.name;
  const branch = payload.pull_request?.head?.ref;

  if (!repo || !branch) {
    throw new Error('Missing required information');
  }

  core.debug(`Running NPM Install: ${repo} ${branch}`);

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

  execSync('npm install', { cwd: dir });

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

export async function prepareForRelease(payload: WebhookPayload) {
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
    case 'private-react-sdk':
    case 'private-react-native':
      return runNpmInstall(payload);

    case 'private-python-sdk':
      throw new SkipActionError(
        `Prepare not neccessary for repository: ${
          payload.repository?.name ?? null
        }`
      );

    default:
      throw new SkipActionError(
        `Prepare not supported for repository: ${
          payload.repository?.name ?? null
        }`
      );
  }
}
