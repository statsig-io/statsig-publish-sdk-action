import * as core from '@actions/core';
import { WebhookPayload } from '@actions/github/lib/interfaces';
import { execSync } from 'child_process';
import { SimpleGit, simpleGit } from 'simple-git';
import { createGitRepoUrl } from './helpers';
import KongOctokit from './kong_octokit';
import { SkipActionError } from './types';

async function runNpmInstall(payload: WebhookPayload) {
  const repo = payload.repository?.name;
  const branch = payload.pull_request?.head?.ref;

  if (!repo || !branch) {
    throw new Error('Missing required information');
  }

  core.debug(`Running NPM Install: ${repo} ${branch}`);

  const token = await KongOctokit.token();
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

async function runJsMonorepoVersionSync(payload: WebhookPayload) {
  const repo = payload.repository?.name;
  const branch = payload.pull_request?.head?.ref;

  if (!repo || !branch) {
    throw new Error('Missing required information');
  }

  core.debug('Running JS Monorepo Version Sync');

  const token = await KongOctokit.token();
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

  execSync('pnpm install', { cwd: dir });
  execSync('pnpm exec nx run statsig:sync-version', {
    cwd: dir,
    stdio: 'inherit'
  });

  await git
    .status()
    .then(status => {
      if (status.isClean()) {
        return;
      }

      const supported = [
        'package.json',
        'packages/client-core/src/StatsigMetadata.ts',
        'pnpm-lock.yaml'
      ];
      const files = status.files
        .filter(file => {
          core.info(`Checking file: ${file.path}`);
          return supported.some(s => file.path.includes(s));
        })
        .map(file => file.path);

      core.info(`Files to commit: ${files.join(', ')}`);

      return git
        .add(files)
        .then(() =>
          git.commit(
            `chore: version synchronized in ${files.length} files by bot`
          )
        )
        .then(() => git.push('origin', branch));
    })
    .catch(err => {
      core.error(err);
    });
}

async function runServerCoreSyncVersion(payload: WebhookPayload) {
  const repo = payload.repository?.name;
  const branch = payload.pull_request?.head?.ref;

  if (!repo || !branch) {
    throw new Error('Missing required information');
  }

  core.debug(`Running pnpm sync-version: ${repo} ${branch}`);

  const token = await KongOctokit.token();
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

  execSync('pnpm install --dir cli', { cwd: dir, stdio: 'inherit' });
  execSync('./tore sync-version', { cwd: dir, stdio: 'inherit' });

  await git.status().then(status => {
    if (status.isClean()) {
      return;
    }

    const supported = [
      'package.json',
      'gradle.properties',
      'Cargo.lock',
      'Cargo.toml',
      'statsig_metadata.rs',
      'post-install.php',
      'Directory.Build.props',
      'main.go',
      'mix.exs'
    ];

    const originalCount = status.files.length;
    const files = status.files
      .filter(file => supported.some(s => file.path.includes(s)))
      .map(file => file.path);

    if (files.length !== originalCount) {
      console.error(
        'More files changed than expected',
        status.files.map(f => f.path),
        files
      );

      const err = new Error('More files changed than expected');
      err.name = 'MissingChangesError';
      throw err;
    }

    return git
      .add(files)
      .then(() =>
        git.commit(`Bot: Version synchronized in ${files.length} files`)
      )
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

  const baseRef = payload.pull_request.base?.ref;
  if (
    baseRef === 'stable' &&
    !payload.pull_request.title?.toLowerCase()?.endsWith('[stable]')
  ) {
    KongOctokit.get().pulls.update({
      owner: 'statsig-io',
      repo: payload.repository.name,
      title: `${payload.pull_request.title} [stable]`,
      pull_number: payload.pull_request.number
    });
  }

  switch (payload.repository?.name) {
    case 'test-sdk-repo-private':
    case 'private-js-client-sdk':
    case 'private-js-lite':
    case 'private-node-js-server-sdk':
    case 'private-node-js-lite-server-sdk':
    case 'private-react-sdk':
    case 'private-react-native':
      return runNpmInstall(payload);

    case 'private-js-client-monorepo':
      return runJsMonorepoVersionSync(payload);

    case 'private-statsig-server-core':
      return runServerCoreSyncVersion(payload);

    case 'private-python-sdk':
    case 'private-go-sdk':
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
