import { resolve } from 'node:path';
import type {
  RemoteHealthCheckInput,
  RemoteProjectInspectInput,
  RemoteProjectStartInput,
} from '@wlbr/protocol';
import { RemoteRuntime } from './runtime.js';
import { StdioJsonRpcServer } from './stdio.js';

export async function createRemoteRuntime(rootDir = resolve(process.cwd(), '.wlbr')): Promise<RemoteRuntime> {
  const runtime = new RemoteRuntime(rootDir);
  await runtime.init();
  return runtime;
}

async function main(): Promise<void> {
  const runtime = await createRemoteRuntime();
  const server = new StdioJsonRpcServer();

  server.register('remote.project.inspect', async (params) => runtime.inspect(params as unknown as RemoteProjectInspectInput));
  server.register('remote.project.start', async (params) => runtime.start(params as unknown as RemoteProjectStartInput));
  server.register('remote.project.list', async () => runtime.list());
  server.register('remote.project.stop', async (params) => runtime.stop(String(params['projectId'])));
  server.register('remote.project.health', async (params) => runtime.health(params as unknown as RemoteHealthCheckInput));

  server.listen();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
