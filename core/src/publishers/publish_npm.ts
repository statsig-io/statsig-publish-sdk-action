import * as core from '@actions/core';
import { PublishActionArgs } from './action_args';
import { execSync, ExecSyncOptionsWithStringEncoding } from 'child_process';
import { identifyPackageManager } from '../js_package_manager_helpers';

export default async function publishToNPM(args: PublishActionArgs) {
  const NPM_TOKEN = core.getInput('npm-token') ?? '';
  if (NPM_TOKEN === '') {
    throw new Error('Call to NPM Publish without settng npm-token');
  }

  const pkgManager = await identifyPackageManager(args.workingDir);

  const commands = [
    `${pkgManager} install`,
    `npm config set //registry.npmjs.org/:_authToken ${NPM_TOKEN}`,
    args.repo === 'wizard'
      ? 'pnpm publish -r'
      : args.isStable
      ? `npm publish --tag stable`
      : 'npm publish'
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

  console.log('🎉 NPM Done!');
}
