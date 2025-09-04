import * as core from '@actions/core';

import { PublishActionArgs } from './action_args';
import { execSync } from 'child_process';

export default async function publishJSMono(args: PublishActionArgs) {
  const NPM_TOKEN = core.getInput('npm-token') ?? '';
  if (NPM_TOKEN === '') {
    throw new Error('Call to NPM Publish without settng npm-token');
  }

  const commands = [
    'pnpm install',
    'npx nx --version',
    `echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc`,
    `pnpm exec nx run statsig:publish-all --verbose`,
  ];

  const opts = {
    cwd: args.workingDir
  };

  for await (const command of commands) {
    console.log(`[${command}] Executing...`);
    try {
      const result = execSync(command, opts);
    } catch (error) {
      console.error(`[${command}] Error`, (error as any).stdout?.toString());
      throw error;
    }
    // console.log(`[${command}] Done`, result);
  }

  console.log('🎉 JS Mono Done!');
}
