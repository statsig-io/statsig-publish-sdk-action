import * as core from '@actions/core';

import { SimpleGit, simpleGit } from 'simple-git';

import KongOctokit from './kong_octokit';
import { SkipActionError } from './types';
import { WebhookPayload } from '@actions/github/lib/interfaces';
import backMergeToMain from './back_merge_to_main';
import { createGitRepoUrl } from './helpers';

export type ActionArgs = {
  version: string;
  title: string;
  body: string;
  publicRepo: string | undefined;
  privateRepo: string;
  sha: string;
  isMain: boolean;
  isBeta: boolean;
  isRC: boolean; // only used for server core for now, is rc version or not, nothing related to branch name
  fromBranch: string; // the branch that the release is being published from
  isStable: boolean;
};

const PRIV_TO_PUB_REPO_MAP: Record<string, string> = {
  'ios-client-sdk': 'statsig-kit',
  'private-android-local-eval': 'android-local-eval',
  'private-android-sdk': 'android-sdk',
  'private-dotnet-sdk': 'dotnet-sdk',
  'private-go-sdk': 'go-sdk',
  'private-java-server-sdk': 'java-server-sdk',
  'private-js-client-sdk': 'js-client',
  'private-js-lite': 'js-lite',
  'private-js-local-eval-sdk': 'js-local-eval',
  'private-node-js-lite-server-sdk': 'node-js-lite-server-sdk',
  'private-node-js-server-sdk': 'node-js-server-sdk',
  'private-php-sdk': 'php-sdk',
  'private-python-sdk': 'python-sdk',
  'private-react-native': 'react-native',
  'private-react-sdk': 'react-sdk',
  'private-ruby-sdk': 'ruby-sdk',
  'private-rust-sdk': 'rust-sdk',
  'private-statsig-server-core': 'statsig-server-core',
  'private-swift-on-device-evaluations-sdk': 'swift-on-device-evaluations-sdk',
  'private-unity-sdk': 'unity-sdk',
  'private-js-client-monorepo': 'js-client-monorepo',
  'private-statsig-ai-node': 'statsig-ai-node',
  'test-sdk-repo-private': 'test-sdk-repo-public'
};

export async function syncReposAndCreateRelease(payload: WebhookPayload) {
  const workingDir = process.cwd() + '/private-sdk';

  const args = validateAndExtractArgsFromPayload(payload);
  core.debug(`Extracted args: ${JSON.stringify(args)}`);

  payload.pull_request;

  const isServerCore = args.privateRepo === 'private-statsig-server-core';
  const isWizard = args.privateRepo === 'wizard';

  if (isServerCore) {
    await backMergeToMain(args);
  }

  if ((isServerCore && args.isRC) || isWizard) {
    await createPrivateGithubRelease(args);
    return;
  }

  await pushToPublic(workingDir, args);
  await createPublicGithubRelease(args);
}

function validateAndExtractArgsFromPayload(
  payload: WebhookPayload
): ActionArgs {
  const headRef = payload.pull_request?.head?.ref;
  const baseRef = payload.pull_request?.base?.ref;
  const sha =
    payload.pull_request?.merge_commit_sha ?? payload.pull_request?.head?.sha;

  if (
    typeof headRef !== 'string' ||
    !headRef.startsWith('releases/') ||
    !headRef.includes('betas/')
  ) {
    throw new SkipActionError('Not a branch on releases/* or betas/*');
  }

  if (baseRef !== 'main' && baseRef !== 'stable' && baseRef !== 'rc') {
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

  const parts = title.split(' ').slice(1);
  const version = parts[0];
  const isRC = /releases\/\d+\.\d+\.\d+-rc\.\d+/.test(headRef);
  const isStable = baseRef === 'stable';
  const fromBranch = baseRef;

  return {
    version,
    title: parts.join(' '),
    body: body ?? '',
    publicRepo,
    privateRepo,
    sha,
    isMain: baseRef === 'main',
    isBeta: headRef.includes('betas/'),
    isRC,
    isStable,
    fromBranch
  };
}

async function pushToPublic(dir: string, args: ActionArgs) {
  const { title, version, privateRepo, publicRepo, sha } = args;

  if (!publicRepo) {
    throw new Error(`Unable to get public repo for ${privateRepo}`);
  }

  const token = await KongOctokit.token();
  const git: SimpleGit = simpleGit();

  // We always push to main
  const base = 'main';

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

async function createPublicGithubRelease(args: ActionArgs) {
  const { title, version, body, publicRepo } = args;

  if (!publicRepo) {
    throw new Error(`Unable to get public repo for ${args.privateRepo}`);
  }

  const releaseName = title
    .replace(/\[rc\]/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const isFromRcBranch = args.fromBranch === 'rc';

  const response = await KongOctokit.get().rest.repos.createRelease({
    owner: 'statsig-io',
    repo: publicRepo,
    tag_name: version,
    body,
    name: releaseName,
    prerelease: args.isBeta || args.isRC,
    generate_release_notes: true,
    make_latest: args.isMain || isFromRcBranch ? 'true' : 'false'
  });

  console.log(`Released: ${JSON.stringify(response)}`);
}

async function createPrivateGithubRelease(args: ActionArgs) {
  const { title, version, body, privateRepo, isRC } = args;

  const releaseName = title
    .replace(/\[rc\]/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const response = await KongOctokit.get().rest.repos.createRelease({
    owner: 'statsig-io',
    repo: privateRepo,
    tag_name: version,
    target_commitish: isRC ? 'rc' : undefined,
    body,
    name: releaseName,
    prerelease: args.isBeta || args.isRC,
    generate_release_notes: true,
    make_latest: args.isMain || args.isStable ? 'true' : 'false'
  });

  console.log(`Released: ${JSON.stringify(response)}`);
}
