import * as core from '@actions/core';
import * as github from '@actions/github';
import {validateAndExtractArgsFromPayload} from './helpers';
import {SkipActionError} from './types';

async function run(): Promise<void> {
  try {
    const payload = github.context.payload;

    const {title, body, version, privateRepo, publicRepo, sha} =
      validateAndExtractArgsFromPayload(payload);

    const token = core.getInput('gh-token');
    const octokit = github.getOctokit(token);

    const sourceCommit = await octokit.rest.git.getCommit({
      owner: 'statsig-io',
      repo: privateRepo,
      commit_sha: sha
    });

    const newCommit = await octokit.rest.git.createCommit({
      owner: 'statsig-io',
      repo: publicRepo,
      message: sourceCommit.data.message,
      tree: sourceCommit.data.tree.sha,
      parents: ['main']
    });

    await octokit.rest.git.updateRef({
      owner: 'statsig-io',
      repo: publicRepo,
      ref: `heads/main`,
      sha: newCommit.data.sha
    });

    const tag = await octokit.rest.git.createTag({
      owner: 'statsig-io',
      repo: publicRepo,
      tag: version,
      message: title,
      object: newCommit.data.sha,
      type: 'commit'
    });

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
