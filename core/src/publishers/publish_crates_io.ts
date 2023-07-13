import * as core from '@actions/core';
import { PublishActionArgs } from './action_args';
import { execSync } from 'child_process';

export default async function publishToCratesIo(args: PublishActionArgs) {
  const CARGO_REGISTRY_TOKEN = core.getInput('cargo-token') ?? '';
  if (CARGO_REGISTRY_TOKEN === '') {
    throw new Error('Call to Crates.io Publish without settng cargo-token');
  }

  const commands = ['cargo publish'];

  const opts = {
    cwd: args.workingDir,
    env: { ...process.env, CARGO_REGISTRY_TOKEN }
  };

  for await (const command of commands) {
    console.log(`[${command}] Executing...`);
    const result = execSync(command, opts);
    console.log(`[${command}] Done`, result);
  }

  console.log('🎉 Crates.io Done!');
}
