import * as core from '@actions/core';

import {WebhookPayload} from '@actions/github/lib/interfaces';
import {exec, execSync} from 'child_process';
import {SkipActionError} from './types';
import {SimpleGit, simpleGit} from 'simple-git';
import {createGitRepoUrl} from './helpers';
import {promisify} from 'util';

const execPromise = promisify(exec);

type ActionArgs = {
  tag: string;
  repo: string;
  githubToken: string;
  workingDir: string;
};

export async function pushReleaseToThirdParties(payload: WebhookPayload) {
  const args = validateAndExtractArgsFromPayload(payload);
  const action = getThirdPartyAction(args.repo);
  await cloneRepo(args);
  await action(args);
}

function getThirdPartyAction(repo: string) {
  switch (repo) {
    case 'test-sdk-repo-public':
    case 'js-client':
    case 'node-js-server-sdk':
    case 'react-sdk':
    case 'react-native':
      return runNpmPublish;

    case 'python-sdk':
      return runPyPackageIndexPublish;

    default:
      throw new SkipActionError(
        `Release not supported for repository: ${repo ?? null}`
      );
  }
}

function validateAndExtractArgsFromPayload(
  payload: WebhookPayload
): ActionArgs {
  const name = payload.repository?.name;
  const tag = payload.release?.tag_name;

  if (typeof name !== 'string' || typeof tag !== 'string') {
    throw new Error('Unable to load repository info');
  }

  const githubToken = core.getInput('gh-token');

  return {
    tag,
    repo: name,
    githubToken,
    workingDir: process.cwd() + '/public-sdk'
  };
}

async function cloneRepo(args: ActionArgs) {
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

async function runNpmPublish(args: ActionArgs) {
  const NPM_TOKEN = core.getInput('npm-token') ?? '';
  if (NPM_TOKEN === '') {
    throw new Error('Call to NPM Publish without settng npm-token');
  }

  const result = execSync(
    `npm install && npm config set //registry.npmjs.org/:_authToken ${NPM_TOKEN} && npm publish`,
    {
      cwd: args.workingDir,
      env: {...process.env, NPM_TOKEN, NPM_AUTH_TOKEN: NPM_TOKEN}
    }
  );

  console.log(`Published: ${JSON.stringify(result.toString())}`);
}

async function runPyPackageIndexPublish(args: ActionArgs) {
  const PYPI_TOKEN = core.getInput('pypi-token') ?? '';
  if (PYPI_TOKEN === '') {
    throw new Error('Call to PyPI Publish without settng pypi-token');
  }

  const version = args.tag.replace('v', '');

  const commands = [
    'python3 setup.py sdist',
    'twine check dist/*',
    `tar tzf dist/statsig-${version}.tar.gz`,
    `twine upload --skip-existing dist/statsig-${version}.tar.gz --verbose -u __token__ -p ${PYPI_TOKEN}`
  ];

  const opts = {
    cwd: args.workingDir
  };

  for await (const command of commands) {
    console.log(`[${command}] Executing...`);
    const {stdout, stderr} = await execPromise(command, opts);
    console.log(`[${command}] Done`, stdout, stderr);
  }

  console.log('🎉 PyPI Done!');
}
