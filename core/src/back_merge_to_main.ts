import { PublishActionArgs } from './publishers/action_args';
import { execSync } from 'child_process';
import KongOctokit from './kong_octokit';
import simpleGit, { SimpleGit } from 'simple-git';
import { createGitRepoUrl } from './helpers';
import { ActionArgs } from './release';

export default async function backMergeToMain(args: ActionArgs) {
  // Only act on stable branch publishes
  if (!args.isStable) {
    console.log('Not a stable publish, skipping back-merge to main');
    return;
  }

  const token = await KongOctokit.token();
  const git: SimpleGit = simpleGit();
  const dir = process.cwd() + '/private-sdk';

  await git
    .clone(createGitRepoUrl(token, args.privateRepo), dir)
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

  const tagToBump = generateTagToBump(args.version);
  execSync(`./tore bump-version ${tagToBump} --create-branch`, { cwd: dir, stdio: 'inherit' });

  console.log('Merging release branch back to main');
  execSync('./tore merge-to-main', { cwd: dir, stdio: 'inherit' });
}

function generateTagToBump(tag: string) {
    if (tag.startsWith("v")) {
      tag = tag.substring(1);
    }
  
    const rcMatch = tag.match(/^(.*)-rc\.(\d+)$/);
    if (rcMatch) {
      // if tag is rc, just increment rc number
      const base = rcMatch[1];
      const rcNumber = parseInt(rcMatch[2], 10) + 1;
      return `${base}-rc.${rcNumber}`;
    } else {
      // if tag is not rc, add rc.1
      return `${tag}-rc.1`;
    }
}
