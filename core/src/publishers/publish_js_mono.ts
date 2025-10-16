import * as core from '@actions/core';

import { PublishActionArgs } from './action_args';
import { execSync, ExecSyncOptionsWithStringEncoding } from 'child_process';

export default async function publishJSMono(args: PublishActionArgs) {
  const NPM_TOKEN = core.getInput('npm-token') ?? '';
  if (NPM_TOKEN === '') {
    throw new Error('Call to NPM Publish without settng npm-token');
  }

  const commands = [
    'pnpm install',
    `echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc`,
    `pnpm exec nx run statsig:publish-all --verbose`
  ];

  const opts: ExecSyncOptionsWithStringEncoding = {
    cwd: args.workingDir,
    encoding: 'utf8'
  };

  for await (const command of commands) {
    console.log(`[${command}] Executing...`);
    const result = execSync(command, opts);
    console.log(`[${command}] Done`, result);
  }

  console.log('🎉 JS Mono Done!');
}
