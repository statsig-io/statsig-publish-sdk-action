import * as core from '@actions/core';

import { PublishActionArgs } from './action_args';
import {
  exec as execCallback,
  execSync,
  ExecSyncOptionsWithStringEncoding
} from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCallback);

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
    const promise = exec(command, opts);
    const { child } = promise;
    const output = await promise;

    if (output.stdout) {
      console.log(`[${command}] stdout:`);
      console.log(output.stdout);
    }
    if (output.stderr) {
      console.log(`[${command}] stderr:`);
      console.error(output.stderr);
    }

    if (child.exitCode) {
      throw new Error(`[${command}] Error! Exit code: ${child.exitCode}`);
    }
    console.log(`[${command}] Done`);
  }

  console.log('🎉 JS Mono Done!');
}
