import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

// --- Types

const SUPPORTED_PKG_MANAGER = ['npm', 'pnpm', 'yarn'] as const;
export type PackageManager = (typeof SUPPORTED_PKG_MANAGER)[number];

interface PackageJson {
  packageManager?: string;
  devEngines?: {
    packageManager?: {
      name?: string;
    };
  };
}

// --- Helpers

function isValidPackageManager(
  value: string | undefined
): value is PackageManager {
  return !!(
    value && (SUPPORTED_PKG_MANAGER as readonly string[]).includes(value)
  );
}

async function readFileIfExists(path: string) {
  try {
    return await readFile(path, 'utf-8');
  } catch (e) {
    return undefined;
  }
}

// --- package.json

async function readPackageJson(rootDir: string): Promise<PackageJson> {
  const packageJsonPath = join(rootDir, 'package.json');
  const packageJsonContent = await readFileIfExists(packageJsonPath);

  try {
    return JSON.parse(packageJsonContent ?? '{}') as PackageJson;
  } catch (e) {
    console.error('Error parsing package.json', e);
  }
  return {};
}

// --- Package manager

function parsePackageManager(
  packageJson: PackageJson
): PackageManager | undefined {
  const devEnginesName = packageJson.devEngines?.packageManager?.name;
  if (isValidPackageManager(devEnginesName)) {
    return devEnginesName;
  }

  const pkgManagerName = packageJson.packageManager?.replace(/\@.*$/, '');
  if (isValidPackageManager(pkgManagerName)) {
    return pkgManagerName;
  }

  return undefined;
}

async function inferPackageManagerFromLockfiles(
  rootDir: string
): Promise<PackageManager | undefined> {
  const files = await readdir(rootDir);

  if (files.includes('package-lock.json')) {
    return 'npm';
  }

  if (files.includes('pnpm-lock.yaml')) {
    return 'pnpm';
  }

  if (files.includes('yarn.lock')) {
    return 'yarn';
  }

  return undefined;
}

export async function identifyPackageManager(
  rootDir: string
): Promise<PackageManager> {
  const packageJson = await readPackageJson(rootDir);

  const packageJsonPkgManager = parsePackageManager(packageJson);
  if (packageJsonPkgManager) {
    return packageJsonPkgManager;
  }

  const lockfilePkgManager = await inferPackageManagerFromLockfiles(rootDir);
  if (lockfilePkgManager) {
    return lockfilePkgManager;
  }

  return 'npm';
}
