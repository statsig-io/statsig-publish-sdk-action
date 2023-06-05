import * as core from '@actions/core';
import * as github from '@actions/github';

import {SimpleGit, simpleGit} from 'simple-git';
import {WebhookPayload} from '@actions/github/lib/interfaces';
import {SkipActionError} from './types';
import {createGitRepoUrl} from './helpers';

type ActionArgs = {
  version: string;
  title: string;
  body: string;
  publicRepo: string;
  privateRepo: string;
  sha: string;
};

const PRIV_TO_PUB_REPO_MAP: Record<string, string> = {
  'private-js-client-sdk': 'js-client',
  'private-rust-sdk': 'rust-sdk',
  'test-sdk-repo-private': 'test-sdk-repo-public'
};

export async function release(payload: WebhookPayload) {
  const args = validateAndExtractArgsFromPayload(payload);

  core.debug(`Extracted args: ${JSON.stringify(args)}`);
  const {title, body, version, privateRepo, publicRepo, sha} = args;

  const token = core.getInput('gh-token');

  const git: SimpleGit = simpleGit();
  const dir = process.cwd() + '/private-sdk';

  await git
    .clone(createGitRepoUrl(token, privateRepo), dir)
    .then(() =>
      git
        .cwd(dir)
        .addConfig('user.name', 'statsig-kong[bot]')
        .addConfig('user.email', 'statsig-kong[bot]@users.noreply.github.com')
    )
    .then(() => git.checkout(sha))
    .then(() => git.addAnnotatedTag(version, title))
    .then(() => git.addRemote('public', createGitRepoUrl(token, publicRepo)))
    .then(() => git.push('public', 'main', ['--follow-tags']));

  const octokit = github.getOctokit(token);

  const response = await octokit.rest.repos.createRelease({
    owner: 'statsig-io',
    repo: publicRepo,
    tag_name: version,
    body,
    name: title,
    draft: core.getBooleanInput('is-draft'),
    generate_release_notes: true
  });

  console.log(`Released: ${JSON.stringify(response)}`);
}

function validateAndExtractArgsFromPayload(
  payload: WebhookPayload
): ActionArgs {
  const ref = payload.pull_request?.head?.ref;
  const sha = payload.pull_request?.head?.sha;

  if (typeof ref !== 'string' || !ref.startsWith('releases/')) {
    throw new SkipActionError('Not a branch on releases/*');
  }

  if (payload.pull_request?.merged !== true) {
    throw new SkipActionError('Not a merged pull request');
  }

  const {title, body} = payload.pull_request;
  if (typeof title !== 'string' || !title.startsWith('[release] ')) {
    throw new SkipActionError('[release] not present in title');
  }

  if (!payload.repository) {
    throw new Error('Unable to load repository info');
  }

  if (typeof sha !== 'string') {
    throw new Error('Unable to load commit SHA');
  }

  const privateRepo = payload.repository.name;
  const publicRepo = PRIV_TO_PUB_REPO_MAP[privateRepo];

  if (!publicRepo) {
    throw new Error(`Unable to get public repo for ${privateRepo}`);
  }

  const parts = title.split(' ').slice(1);
  const version = parts[0];

  return {
    version,
    title: parts.join(' '),
    body: body ?? '',
    publicRepo,
    privateRepo,
    sha
  };
}
