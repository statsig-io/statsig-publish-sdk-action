import * as core from '@actions/core';
import { PublishActionArgs } from './action_args';

import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export default async function publishToPyPI(args: PublishActionArgs) {
  const isBeta = core.getBooleanInput('is-beta');
  const tokenName = isBeta ? 'pypi-beta-token' : 'pypi-token';

  const PYPI_TOKEN = core.getInput(tokenName) ?? '';
  if (PYPI_TOKEN === '') {
    throw new Error('Call to PyPI Publish without settng pypi-token');
  }

  const version = args.tag.replace('v', '');

  let uploadCommand = `twine upload --skip-existing dist/statsig-${version}.tar.gz --verbose -u __token__ -p ${PYPI_TOKEN}`;
  if (isBeta) {
    uploadCommand += ' --repository-url https://test.pypi.org/legacy/';
  }

  const commands = [
    'python3 setup.py sdist',
    'twine check dist/*',
    `tar tzf dist/statsig-${version}.tar.gz`,
    uploadCommand
  ];

  const opts = {
    cwd: args.workingDir
  };

  for await (const command of commands) {
    console.log(`[${command}] Executing...`);
    const { stdout, stderr } = await execPromise(command, opts);
    console.log(`[${command}] Done`, stdout, stderr);
  }

  console.log('🎉 PyPI Done!');
}
