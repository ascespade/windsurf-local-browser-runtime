import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface ProjectPlan {
  framework: 'nextjs' | 'vite' | 'laravel' | 'node' | 'unknown';
  packageManager: 'pnpm' | 'npm' | 'yarn' | 'bun' | 'unknown';
  installCommand: string;
  startCommand: string;
  buildCommand: string | undefined;
  testCommand: string | undefined;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
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
    };
  }

  const packageJsonPath = join(cwd, 'package.json');
  if (!(await fileExists(packageJsonPath))) {
    return {
      framework: 'unknown',
      packageManager: 'unknown',
      installCommand: 'echo "No package.json found"',
      startCommand: 'echo "No runnable project detected"',
      buildCommand: undefined,
      testCommand: undefined,
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

  const packageManager = pkg.packageManager?.startsWith('pnpm')
    ? 'pnpm'
    : pkg.packageManager?.startsWith('yarn')
      ? 'yarn'
      : pkg.packageManager?.startsWith('bun')
        ? 'bun'
        : 'npm';

  const framework =
    'next' in dependencies
      ? 'nextjs'
      : 'vite' in dependencies
        ? 'vite'
        : 'express' in dependencies || 'fastify' in dependencies
          ? 'node'
          : 'unknown';

  return {
    framework,
    packageManager,
    installCommand:
      packageManager === 'pnpm'
        ? 'pnpm install'
        : packageManager === 'yarn'
          ? 'yarn install'
          : packageManager === 'bun'
            ? 'bun install'
            : 'npm install',
    startCommand:
      pkg.scripts?.['dev'] ??
      pkg.scripts?.['start'] ??
      'npm run dev',
    buildCommand: pkg.scripts?.['build'],
    testCommand: pkg.scripts?.['test'],
  };
}
