import * as core from '@actions/core';
import * as github from '@actions/github';
import {SimpleGit, simpleGit} from 'simple-git';
import {createGitRepoUrl, validateAndExtractArgsFromPayload} from './helpers';
import {SkipActionError} from './types';

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

    const octokit = github.getOctokit(token);

    const response = await octokit.rest.repos.createRelease({
      owner: 'statsig-io',
      repo: publicRepo,
      tag_name: version,
      body,
      name: title,
      generate_release_notes: true
    });

    console.log(`Released: ${response}`);
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
