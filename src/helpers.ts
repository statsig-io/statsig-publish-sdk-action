import {WebhookPayload} from '@actions/github/lib/interfaces';
import {SkipActionError} from './types';

const PRIV_TO_PUB_REPO_MAP: Record<string, string> = {
  'private-js-client-sdk': 'js-client',
  'private-rust-sdk': 'rust-sdk',
  'test-sdk-repo-private': 'test-sdk-repo-public'
};

type ActionArgs = {
  version: string;
  title: string;
  body: string;
  publicRepo: string;
  privateRepo: string;
  sha: string;
};

export function validateAndExtractArgsFromPayload(
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

  const {title, body} = payload.pull_request;

  return {
    version: '1',
    title,
    body: body ?? '',
    publicRepo,
    privateRepo,
    sha
  };
}
