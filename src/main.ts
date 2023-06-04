import * as core from '@actions/core';
import * as github from '@actions/github';
import {createGitRepoUrl, validateAndExtractArgsFromPayload} from './helpers';
import {SkipActionError} from './types';
import {execSync} from 'child_process';
import {simpleGit, SimpleGit, CleanOptions} from 'simple-git';

async function run(): Promise<void> {
  try {
    const payload = github.context.payload;
    core.debug(`Payload: ${JSON.stringify(payload)}`);

    const args = validateAndExtractArgsFromPayload(payload);

    core.debug(`Extracted args: ${JSON.stringify(args)}`);
    const {title, body, version, privateRepo, publicRepo, sha} = args;

    const token = core.getInput('gh-token');

    const git: SimpleGit = simpleGit();
    const dir = process.cwd() + '/private-sdk';

    await git
      .addConfig('user.name', 'statsig-kong[bot]')
      .addConfig('user.email', 'statsig-kong[bot]@users.noreply.github.com')
      .clone(createGitRepoUrl(token, privateRepo), dir)
      .then(() => console.log('cloned'))
      .then(() => git.cwd(dir))
      .then(() => console.log('changed dir'))
      .then(() => git.checkout(sha))
      .then(() => console.log('checked out'))
      .then(() => git.addAnnotatedTag(version, title))
      .then(() => console.log('tagged'))
      .then(() => git.addRemote('public', createGitRepoUrl(token, publicRepo)))
      .then(() => console.log('added remote'))
      .then(() => git.push('public', 'main'))
      .then(() => console.log('pushed'));

    // const octokit = github.getOctokit(token);

    // const sourceCommit = await octokit.rest.git.getCommit({
    //   owner: 'statsig-io',
    //   repo: privateRepo,
    //   commit_sha: sha
    // });

    // core.debug(`Source Commit: ${JSON.stringify(sourceCommit)}`);

    // const newTree = await octokit.rest.git.createTree({
    //   owner: 'statsig-io',
    //   repo: publicRepo,
    //   base_tree: sourceCommit.data.tree.sha,
    //   tree: []
    // });

    // core.debug(`New Tree: ${JSON.stringify(newTree)}`);

    // const newCommit = await octokit.rest.git.createCommit({
    //   owner: 'statsig-io',
    //   repo: publicRepo,
    //   message: sourceCommit.data.message,
    //   tree: newTree.data.sha,
    //   parents: ['main']
    // });

    // core.debug(`New Commit: ${JSON.stringify(newCommit)}`);

    // await octokit.rest.git.updateRef({
    //   owner: 'statsig-io',
    //   repo: publicRepo,
    //   ref: `heads/main`,
    //   sha: newCommit.data.sha
    // });

    // const tag = await octokit.rest.git.createTag({
    //   owner: 'statsig-io',
    //   repo: publicRepo,
    //   tag: version,
    //   message: title,
    //   object: newCommit.data.sha,
    //   type: 'commit'
    // });

    const json = JSON.stringify(github.context.payload, undefined, 2);
    console.log(`The event payload: ${json}`);
  } catch (error) {
    if (error instanceof SkipActionError) {
      console.log(`Skipped: ${error.message}`);
      return;
    }

    if (error instanceof Error) {
      console.error(error);
      core.setFailed(error.message);
    }
  }
}

run();
