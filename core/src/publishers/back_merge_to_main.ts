import { PublishActionArgs } from './action_args';
import { execSync } from 'child_process';
import KongOctokit from '../kong_octokit';
import simpleGit, { SimpleGit } from 'simple-git';
import { createGitRepoUrl } from '../helpers';

export default async function backMergeToMain(args: PublishActionArgs) {
  // Only act on stable branch publishes
  if (!args.isStable) {
    console.log('Not a stable publish, skipping back-merge to main');
    return;
  }

  const token = await KongOctokit.token();
  const git: SimpleGit = simpleGit();
  const dir = process.cwd() + '/private-sdk';

  await git
    .clone(createGitRepoUrl(token, args.repo), dir)
    .then(() =>
      git
        .cwd(dir)
        .addConfig('user.name', 'statsig-kong[bot]')
        .addConfig('user.email', 'statsig-kong[bot]@users.noreply.github.com')
    );

  console.log('Fetching all and checking out main');
  await git.fetch('origin');
  await git.checkout('main');
  await git.pull('origin', 'main');

  execSync('pnpm install --dir cli', { cwd: dir, stdio: 'inherit' });
  execSync(`./tore bump-version ${args.tag} --create-branch`, { cwd: dir, stdio: 'inherit' });

  console.log('Merging release branch back to main');
  execSync('./tore merge-to-main', { cwd: dir, stdio: 'inherit' });
}