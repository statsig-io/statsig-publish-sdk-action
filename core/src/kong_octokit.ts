import * as core from '@actions/core';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

export default abstract class KongOctokit {
  static get(): Octokit {
    const token = core.getInput('kong-private-key');

    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: 229901,
        installationId: 36921303,
        privateKey: JSON.parse(token)
      }
    });
  }
}
