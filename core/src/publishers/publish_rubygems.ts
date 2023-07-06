import * as core from '@actions/core';
import { PublishActionArgs } from './action_args';

import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export default async function publishToRubyGems(args: PublishActionArgs) {
  const RUBYGEMS_KEY = core.getInput('rubygems-key');
  if (RUBYGEMS_KEY === '') {
    throw new Error('Call to RubyGems Publish without settng rubygems-key');
  }

  const version = args.tag.replace('v', '');
  const commands = [
    'gem build'
    // `gem push statsig-${version}.gem`
  ];

  for await (const command of commands) {
    console.log(`[${command}] Executing...`);
    const { stdout, stderr } = await execPromise(command, {
      cwd: args.workingDir
    });
    console.log(`[${command}] Done`, stdout, stderr);
  }

  console.log('🎉 RubyGems Done!');
}
