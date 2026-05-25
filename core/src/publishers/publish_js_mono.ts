import * as core from '@actions/core';

import { PublishActionArgs } from './action_args';
import { execSync, ExecSyncOptionsWithStringEncoding } from 'child_process';
import { hasOIDCEnv } from '../helpers';

export default async function publishJSMono(args: PublishActionArgs) {
  const NPM_TOKEN = (core.getInput('npm-token') ?? '').trim();
  if (!hasOIDCEnv() && NPM_TOKEN === '') {
    throw new Error('Call to NPM Publish without settng npm-token');
  }

  const commands = [
    'pnpm install',
    NPM_TOKEN ? `echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc` :
      'echo "//registry.npmjs.org/" > .npmrc',
    `pnpm exec nx run statsig:publish-all --verbose`
  ].filter(Boolean);

  const opts: ExecSyncOptionsWithStringEncoding = {
    cwd: args.workingDir,
    encoding: 'utf8',
    stdio: ['ignore', 'inherit', 'inherit']
  };

  for await (const command of commands) {
    console.log(`[${command}] Executing...`);
    try {
      execSync(command, opts);
    } catch (e) {
      console.log(`[${command}] Error!`);
      throw e;
    }

    console.log(`[${command}] Done`);
  }

  console.log('🎉 JS Mono Done!');
}
