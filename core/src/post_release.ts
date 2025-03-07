import { WebhookPayload } from '@actions/github/lib/interfaces';
import { SimpleGit, simpleGit } from 'simple-git';
import { createGitRepoUrl } from './helpers';
import KongOctokit from './kong_octokit';
import publishToNPM from './publishers/publish_npm';
import publishToPyPI from './publishers/publish_pypi';
import publishToRubyGems from './publishers/publish_rubygems';
import { SkipActionError } from './types';
import { PublishActionArgs } from './publishers/action_args';
import publishToCratesIo from './publishers/publish_crates_io';
import publishJSMono from './publishers/publish_js_mono';

export async function pushReleaseToThirdParties(payload: WebhookPayload) {
  const args = await validateAndExtractArgsFromPayload(payload);
  const action = getThirdPartyAction(args.repo);
  await cloneRepo(args);
  await action(args);
}

function getThirdPartyAction(repo: string) {
  switch (repo) {
    case 'test-sdk-repo-public':
    case 'js-client':
    case 'js-lite':
    case 'js-local-eval':
    case 'node-js-server-sdk':
    case 'node-js-lite-server-sdk':
    case 'react-sdk':
    case 'react-native':
      return publishToNPM;

    case 'python-sdk':
      return publishToPyPI;

    case 'ruby-sdk':
      return publishToRubyGems;

    case 'rust-sdk':
      return publishToCratesIo;
    
    case 'js-client-monorepo':
      return publishJSMono;

    case 'statsig-server-core' /* server-core use its own gh action */:
    case 'go-sdk':
    case 'android-sdk':
      return () => {
        // noop
      };

    default:
      throw new SkipActionError(
        `Post Release not supported for repository: ${repo ?? null}`
      );
  }
}

async function validateAndExtractArgsFromPayload(
  payload: WebhookPayload
): Promise<PublishActionArgs> {
  const name = payload.repository?.name;
  const tag = payload.release?.tag_name;
  const isStable =
    payload.release?.name?.toLowerCase().includes('[stable]') === true;

  if (typeof name !== 'string' || typeof tag !== 'string') {
    throw new Error('Unable to load repository info');
  }
  const isBeta =
    payload.pull_request?.head?.ref?.includes('betas/') ||
    payload.release?.prerelease;
  const githubToken = await KongOctokit.token();

  return {
    tag,
    repo: name,
    githubToken,
    workingDir: process.cwd() + '/public-sdk',
    isStable,
    isBeta: isBeta === true
  };
}

async function cloneRepo(args: PublishActionArgs) {
  const git: SimpleGit = simpleGit();

  await git.clone(
    createGitRepoUrl(args.githubToken, args.repo),
    args.workingDir,
    {
      '--depth': 1,
      '--branch': args.tag
    }
  );
}
