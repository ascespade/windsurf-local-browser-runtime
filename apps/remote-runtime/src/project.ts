import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface ProjectPlan {
  framework: 'nextjs' | 'vite' | 'laravel' | 'node' | 'unknown';
  packageManager: 'pnpm' | 'npm' | 'yarn' | 'bun' | 'unknown';
  installCommand: string;
  startCommand: string;
  buildCommand: string | undefined;
  testCommand: string | undefined;
  supported: boolean;
  reason?: string;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function detectPackageManager(packageManagerField: string | undefined): ProjectPlan['packageManager'] {
  if (packageManagerField?.startsWith('pnpm')) return 'pnpm';
  if (packageManagerField?.startsWith('yarn')) return 'yarn';
  if (packageManagerField?.startsWith('bun')) return 'bun';
  if (packageManagerField?.startsWith('npm')) return 'npm';
  return 'npm';
}

function installCommandFor(manager: ProjectPlan['packageManager']): string {
  switch (manager) {
    case 'pnpm':
      return 'pnpm install';
    case 'yarn':
      return 'yarn install';
    case 'bun':
      return 'bun install';
    case 'npm':
    default:
      return 'npm install';
  }
}

export async function detectProject(cwd: string): Promise<ProjectPlan> {
  if (await fileExists(join(cwd, 'artisan'))) {
    return {
      framework: 'laravel',
      packageManager: 'unknown',
      installCommand: 'composer install && npm install',
      startCommand: 'php artisan serve --host=0.0.0.0 --port=${PORT:-8000}',
      buildCommand: 'npm run build',
      testCommand: 'php artisan test',
      supported: true,
    };
  }

  const packageJsonPath = join(cwd, 'package.json');
  if (!(await fileExists(packageJsonPath))) {
    return {
      framework: 'unknown',
      packageManager: 'unknown',
      installCommand: '',
      startCommand: '',
      buildCommand: undefined,
      testCommand: undefined,
      supported: false,
      reason: 'No package.json found in target cwd',
    };
  }

  const pkg = JSON.parse(await readFile(packageJsonPath, 'utf8')) as {
    scripts?: Record<string, string>;
    packageManager?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const dependencies = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
  };

  const packageManager = detectPackageManager(pkg.packageManager);
  const framework =
    'next' in dependencies
      ? 'nextjs'
      : 'vite' in dependencies
        ? 'vite'
        : 'express' in dependencies || 'fastify' in dependencies
          ? 'node'
          : 'unknown';

  const startCommand = pkg.scripts?.['dev'] ?? pkg.scripts?.['start'] ?? '';
  const buildCommand = pkg.scripts?.['build'];
  const testCommand = pkg.scripts?.['test'];

  if (!startCommand) {
    return {
      framework,
      packageManager,
      installCommand: installCommandFor(packageManager),
      startCommand: '',
      buildCommand,
      testCommand,
      supported: false,
      reason: 'package.json is present but no dev/start script was found',
    };
  }

  if (framework === 'unknown') {
    return {
      framework,
      packageManager,
      installCommand: installCommandFor(packageManager),
      startCommand,
      buildCommand,
      testCommand,
      supported: false,
      reason: 'Project scripts exist, but framework classification is unknown and runtime policy refuses to guess',
    };
  }

  return {
    framework,
    packageManager,
    installCommand: installCommandFor(packageManager),
    startCommand,
    buildCommand,
    testCommand,
    supported: true,
  };
}
