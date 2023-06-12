import * as core from '@actions/core';
import * as github from '@actions/github';

import {WebhookPayload} from '@actions/github/lib/interfaces';
import {execSync} from 'child_process';
import {SimpleGit, simpleGit} from 'simple-git';
import {createGitRepoUrl} from './helpers';
import {SkipActionError} from './types';

type ActionArgs = {
  version: string;
  title: string;
  body: string;
  publicRepo: string;
  privateRepo: string;
  sha: string;
  token: string;
};

const PRIV_TO_PUB_REPO_MAP: Record<string, string> = {
  'ios-client-sdk': 'ios-sdk',
  'private-js-client-sdk': 'js-client',
  'private-node-js-server-sdk': 'node-js-server-sdk',
  'private-react-native': 'react-native',
  'private-react-sdk': 'react-sdk',
  'private-rust-sdk': 'rust-sdk',
  'test-sdk-repo-private': 'test-sdk-repo-public'
};

export async function release(payload: WebhookPayload) {
  const workingDir = process.cwd() + '/private-sdk';

  const args = validateAndExtractArgsFromPayload(payload);
  core.debug(`Extracted args: ${JSON.stringify(args)}`);

  await pushToPublic(workingDir, args);
  await createGithubRelease(args);
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
  const token = core.getInput('gh-token');

  return {
    version,
    title: parts.join(' '),
    body: body ?? '',
    publicRepo,
    privateRepo,
    sha,
    token
  };
}

async function pushToPublic(dir: string, args: ActionArgs) {
  const {title, version, privateRepo, publicRepo, sha, token} = args;

  const git: SimpleGit = simpleGit();

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
}

async function createGithubRelease(args: ActionArgs) {
  const {title, version, body, publicRepo, token} = args;
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
