import * as core from '@actions/core';

import { WebhookPayload } from '@actions/github/lib/interfaces';
import { SimpleGit, simpleGit } from 'simple-git';
import { createGitRepoUrl } from './helpers';
import { SkipActionError } from './types';
import KongOctokit from './kong_octokit';

type ActionArgs = {
  version: string;
  title: string;
  body: string;
  publicRepo: string;
  privateRepo: string;
  sha: string;
  isMain: boolean;
};

const PRIV_TO_PUB_REPO_MAP: Record<string, string> = {
  'ios-client-sdk': 'ios-sdk',
  'private-android-sdk': 'android-sdk',
  'private-go-sdk': 'go-sdk',
  'private-js-client-sdk': 'js-client',
  'private-js-lite': 'js-lite',
  'private-node-js-server-sdk': 'node-js-server-sdk',
  'private-python-sdk': 'python-sdk',
  'private-react-native': 'react-native',
  'private-react-sdk': 'react-sdk',
  'private-rust-sdk': 'rust-sdk',
  'private-ruby-sdk': 'ruby-sdk',
  'test-sdk-repo-private': 'test-sdk-repo-public'
};

export async function syncReposAndCreateRelease(payload: WebhookPayload) {
  const workingDir = process.cwd() + '/private-sdk';

  const args = validateAndExtractArgsFromPayload(payload);
  core.debug(`Extracted args: ${JSON.stringify(args)}`);

  payload.pull_request;

  await pushToPublic(workingDir, args);
  await createGithubRelease(args);
}

function validateAndExtractArgsFromPayload(
  payload: WebhookPayload
): ActionArgs {
  const headRef = payload.pull_request?.head?.ref;
  const baseRef = payload.pull_request?.base?.ref;
  const sha =
    payload.pull_request?.merge_commit_sha ?? payload.pull_request?.head?.sha;

  if (typeof headRef !== 'string' || !headRef.startsWith('releases/')) {
    throw new SkipActionError('Not a branch on releases/*');
  }

  if (baseRef !== 'main' && baseRef !== 'stable') {
    throw new SkipActionError('Pull request not against a valid branch');
  }

  if (payload.pull_request?.merged !== true) {
    throw new SkipActionError('Not a merged pull request');
  }

  const { title, body } = payload.pull_request;
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
    sha,
    isMain: baseRef === 'main'
  };
}

async function pushToPublic(dir: string, args: ActionArgs) {
  const { title, version, privateRepo, publicRepo, sha } = args;

  const token = await KongOctokit.token();
  const git: SimpleGit = simpleGit();

  const base = args.isMain ? 'main' : 'stable';

  await git
    .clone(createGitRepoUrl(token, privateRepo), dir)
    .then(() =>
      git
        .cwd(dir)
        .addConfig('user.name', 'statsig-kong[bot]')
        .addConfig('user.email', 'statsig-kong[bot]@users.noreply.github.com')
    )
    .then(() => git.checkout(sha))
    .then(() => git.addRemote('public', createGitRepoUrl(token, publicRepo)))
    .then(() => git.push('public', `${sha}:${base}`))
    .then(() => git.checkoutLocalBranch(`releases/${version}`))
    .then(() => git.addAnnotatedTag(version, title))
    .then(() => git.push('public', `releases/${version}`, ['--follow-tags']));
}

async function createGithubRelease(args: ActionArgs) {
  const { title, version, body, publicRepo } = args;

  const response = await KongOctokit.get().rest.repos.createRelease({
    owner: 'statsig-io',
    repo: publicRepo,
    tag_name: version,
    body,
    name: title,
    prerelease: core.getBooleanInput('is-beta'),
    generate_release_notes: true,
    make_latest: args.isMain ? 'true' : 'false'
  });

  console.log(`Released: ${JSON.stringify(response)}`);
}
