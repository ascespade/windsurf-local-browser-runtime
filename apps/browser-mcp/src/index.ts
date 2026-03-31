import { resolve } from 'node:path';
import type {
  BrowserAttachInput,
  BrowserClickInput,
  BrowserCloseSessionInput,
  BrowserEvalInput,
  BrowserLaunchInput,
  BrowserOpenInput,
  BrowserSnapshotInput,
  BrowserTypeInput,
  BrowserWaitForInput,
} from '@wlbr/protocol';
import { BrowserRuntime } from './runtime.js';
import { StdioJsonRpcServer } from './stdio.js';

export async function createBrowserRuntime(rootDir = resolve(process.cwd(), '.wlbr')): Promise<BrowserRuntime> {
  const runtime = new BrowserRuntime({ rootDir });
  await runtime.init();
  return runtime;
}

async function main(): Promise<void> {
  const runtime = await createBrowserRuntime();
  const server = new StdioJsonRpcServer();

  server.register('browser.launch', async (params) => runtime.launch(params as unknown as BrowserLaunchInput));
  server.register('browser.attach', async (params) => runtime.attach(params as unknown as BrowserAttachInput));
  server.register('browser.listSessions', async () => runtime.listSessions());
  server.register('browser.open', async (params) => runtime.open(params as unknown as BrowserOpenInput));
  server.register('browser.click', async (params) => runtime.click(params as unknown as BrowserClickInput));
  server.register('browser.type', async (params) => runtime.type(params as unknown as BrowserTypeInput));
  server.register('browser.waitFor', async (params) => runtime.waitFor(params as unknown as BrowserWaitForInput));
  server.register('browser.eval', async (params) => runtime.evaluate(params as unknown as BrowserEvalInput));
  server.register('browser.snapshot', async (params) => runtime.snapshot(params as unknown as BrowserSnapshotInput));
  server.register('browser.closeSession', async (params) => runtime.closeSession(params as unknown as BrowserCloseSessionInput));

  server.listen();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
