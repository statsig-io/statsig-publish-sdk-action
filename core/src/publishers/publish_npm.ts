import * as core from '@actions/core';
import { PublishActionArgs } from './action_args';
import { execSync } from 'child_process';

export default async function publishToNPM(args: PublishActionArgs) {
  const NPM_TOKEN = core.getInput('npm-token') ?? '';
  if (NPM_TOKEN === '') {
    throw new Error('Call to NPM Publish without settng npm-token');
  }

  const result = execSync(
    `npm install && npm config set //registry.npmjs.org/:_authToken ${NPM_TOKEN} && npm publish`,
    {
      cwd: args.workingDir,
      env: { ...process.env, NPM_TOKEN, NPM_AUTH_TOKEN: NPM_TOKEN }
    }
  );

  const commands = [
    'npm install',
    `npm config set //registry.npmjs.org/:_authToken ${NPM_TOKEN}`,
    args.isStable ? `npm publish --tag stable` : 'npm publish'
  ];

  const opts = {
    cwd: args.workingDir
  };

  for await (const command of commands) {
    console.log(`[${command}] Executing...`);
    const result = execSync(command, opts);
    console.log(`[${command}] Done`, result);
  }

  console.log(`Published: ${JSON.stringify(result.toString())}`);
}
