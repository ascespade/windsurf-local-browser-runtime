import { test, describe, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdir, writeFile, rm, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectProject } from '../src/project.ts';
import { RemoteRuntime } from '../src/runtime.ts';

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs) {
    try {
      await rm(dir, { recursive: true, force: true });
    } catch {
      /* cleanup */
    }
  }
  tempDirs.length = 0;
});

async function createTestProject(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'remote-test-'));
  tempDirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    const filePath = join(dir, name);
    await mkdir(join(filePath, '..'), { recursive: true });
    await writeFile(filePath, content, 'utf8');
  }
  return dir;
}

describe('Remote Runtime - Project Detection', () => {
  test('should detect Next.js project from dependencies', async () => {
    const dir = await createTestProject({
      'package.json': JSON.stringify({
        name: 'next-app',
        dependencies: { next: '14.0.0', react: '18.0.0' },
        scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
      }),
    });

    const plan = await detectProject(dir);
    assert.equal(plan.framework, 'nextjs');
    assert.equal(plan.startCommand, 'next dev');
    assert.equal(plan.buildCommand, 'next build');
    assert.equal(plan.installCommand, 'npm install');
  });

  test('should detect Vite project from dependencies', async () => {
    const dir = await createTestProject({
      'package.json': JSON.stringify({
        name: 'vite-app',
        dependencies: { vite: '5.0.0', react: '18.0.0' },
        scripts: { dev: 'vite', build: 'vite build' },
      }),
    });

    const plan = await detectProject(dir);
    assert.equal(plan.framework, 'vite');
    assert.equal(plan.startCommand, 'vite');
  });

  test('should detect Node project with express', async () => {
    const dir = await createTestProject({
      'package.json': JSON.stringify({
        name: 'express-app',
        dependencies: { express: '4.18.0' },
        scripts: { start: 'node index.js', dev: 'nodemon index.js' },
      }),
    });

    const plan = await detectProject(dir);
    assert.equal(plan.framework, 'node');
    assert.equal(plan.startCommand, 'nodemon index.js');
  });

  test('should detect Node project with fastify', async () => {
    const dir = await createTestProject({
      'package.json': JSON.stringify({
        name: 'fastify-app',
        dependencies: { fastify: '4.0.0' },
        scripts: { start: 'node server.js' },
      }),
    });

    const plan = await detectProject(dir);
    assert.equal(plan.framework, 'node');
  });

  test('should detect Laravel project from artisan file', async () => {
    const dir = await createTestProject({ artisan: '#!/usr/bin/env php' });

    const plan = await detectProject(dir);
    assert.equal(plan.framework, 'laravel');
    assert.ok(plan.startCommand.includes('artisan serve'));
    assert.equal(plan.installCommand, 'composer install && npm install');
  });

  test('should return unknown framework for unrecognized project', async () => {
    const dir = await createTestProject({
      'package.json': JSON.stringify({
        name: 'mystery-app',
        dependencies: { lodash: '4.17.0' },
      }),
    });

    const plan = await detectProject(dir);
    assert.equal(plan.framework, 'unknown');
    assert.equal(plan.supported, false);
    assert.ok(plan.reason?.includes('unknown'));
  });

  test('should return unknown for directory with no package.json', async () => {
    const dir = await createTestProject({ 'README.md': '# Empty project' });

    const plan = await detectProject(dir);
    assert.equal(plan.framework, 'unknown');
    assert.equal(plan.packageManager, 'unknown');
    assert.equal(plan.buildCommand, undefined);
    assert.equal(plan.testCommand, undefined);
    assert.equal(plan.supported, false);
    assert.equal(plan.startCommand, '');
  });

  test('should detect pnpm package manager', async () => {
    const dir = await createTestProject({
      'package.json': JSON.stringify({
        name: 'pnpm-app',
        packageManager: 'pnpm@9.0.0',
        dependencies: {},
      }),
    });

    const plan = await detectProject(dir);
    assert.equal(plan.packageManager, 'pnpm');
    assert.equal(plan.installCommand, 'pnpm install');
  });

  test('should detect yarn package manager', async () => {
    const dir = await createTestProject({
      'package.json': JSON.stringify({
        name: 'yarn-app',
        packageManager: 'yarn@4.0.0',
        dependencies: {},
      }),
    });

    const plan = await detectProject(dir);
    assert.equal(plan.packageManager, 'yarn');
    assert.equal(plan.installCommand, 'yarn install');
  });

  test('should detect bun package manager', async () => {
    const dir = await createTestProject({
      'package.json': JSON.stringify({
        name: 'bun-app',
        packageManager: 'bun@1.0.0',
        dependencies: {},
      }),
    });

    const plan = await detectProject(dir);
    assert.equal(plan.packageManager, 'bun');
    assert.equal(plan.installCommand, 'bun install');
  });

  test('should default to npm when no packageManager field', async () => {
    const dir = await createTestProject({
      'package.json': JSON.stringify({ name: 'npm-app', dependencies: {} }),
    });

    const plan = await detectProject(dir);
    assert.equal(plan.packageManager, 'npm');
    assert.equal(plan.installCommand, 'npm install');
  });

  test('should detect test command from scripts', async () => {
    const dir = await createTestProject({
      'package.json': JSON.stringify({
        name: 'tested-app',
        scripts: { test: 'jest', dev: 'node server.js' },
        dependencies: {},
      }),
    });

    const plan = await detectProject(dir);
    assert.equal(plan.testCommand, 'jest');
  });

  test('should prefer dev script over start script', async () => {
    const dir = await createTestProject({
      'package.json': JSON.stringify({
        name: 'app',
        scripts: { dev: 'nodemon', start: 'node index.js' },
        dependencies: {},
      }),
    });

    const plan = await detectProject(dir);
    assert.equal(plan.startCommand, 'nodemon');
  });

  test('should mark project unsupported when no scripts', async () => {
    const dir = await createTestProject({
      'package.json': JSON.stringify({ name: 'no-scripts', dependencies: {} }),
    });

    const plan = await detectProject(dir);
    assert.equal(plan.startCommand, '');
    assert.equal(plan.supported, false);
    assert.ok(plan.reason?.includes('no dev/start script'));
  });

  test('should detect devDependencies framework', async () => {
    const dir = await createTestProject({
      'package.json': JSON.stringify({
        name: 'vite-dev',
        devDependencies: { vite: '5.0.0' },
      }),
    });

    const plan = await detectProject(dir);
    assert.equal(plan.framework, 'vite');
    assert.equal(plan.supported, false);
  });
});

describe('Remote Runtime - Lifecycle', () => {
  test('should reject unsupported projects on start', async () => {
    const dir = await createTestProject({
      'package.json': JSON.stringify({
        name: 'unknown-supported-false',
        scripts: { dev: 'node server.js' },
        dependencies: { lodash: '4.17.0' },
      }),
    });

    const runtimeRoot = await mkdtemp(join(tmpdir(), 'remote-state-'));
    tempDirs.push(runtimeRoot);

    const runtime = new RemoteRuntime(runtimeRoot);
    await runtime.init();

    await assert.rejects(
      () => runtime.start({ cwd: dir, strategy: 'auto' }),
      (error: Error) => {
        assert.ok(error.message.includes('unsupported project'));
        return true;
      },
    );

    assert.deepEqual(runtime.list(), []);
  });

  test('health should report success against reachable url', async () => {
    const server = createServer((_, response) => {
      response.writeHead(200, { 'content-type': 'text/plain' });
      response.end('ok-from-test-server');
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address === 'object');

    const runtimeRoot = await mkdtemp(join(tmpdir(), 'remote-state-'));
    tempDirs.push(runtimeRoot);
    const runtime = new RemoteRuntime(runtimeRoot);
    await runtime.init();

    try {
      const result = await runtime.health({
        url: `http://127.0.0.1:${address.port}`,
        timeoutMs: 1_000,
      });
      assert.equal(result.ok, true);
      assert.equal(result.status, 200);
      assert.ok(result.bodyPreview?.includes('ok-from-test-server'));
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  });
});
