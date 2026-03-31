import { resolve } from 'node:path';
import { createEvidenceBundle } from '@wlbr/audit-core';
import type {
  BrowserSessionRecord,
  OrchestratorTaskInput,
  RemoteProjectRecord,
} from '@wlbr/protocol';
import { withRetry } from '@wlbr/retry-policy';
import { LocalToolClient } from './client.js';

export interface LaunchAndProbeResult {
  remoteProject: RemoteProjectRecord;
  browserSession: BrowserSessionRecord;
  evidenceBundle: ReturnType<typeof createEvidenceBundle>;
}

export async function runLaunchAndProbe(
  input: OrchestratorTaskInput,
): Promise<LaunchAndProbeResult> {
  const browserClient = new LocalToolClient(process.execPath, [
    '--experimental-strip-types',
    resolve(process.cwd(), 'apps/browser-mcp/src/index.ts'),
  ]);
  const remoteClient = new LocalToolClient(process.execPath, [
    '--experimental-strip-types',
    resolve(process.cwd(), 'apps/remote-runtime/src/index.ts'),
  ]);

  try {
    const remoteProject = await remoteClient.call<RemoteProjectRecord>(
      'remote.project.start',
      {
        cwd: input.cwd,
        strategy: 'auto',
      },
    );

    const targetUrl = input.targetUrl ?? remoteProject.url;
    if (!targetUrl) {
      throw new Error('Remote runtime did not return a URL');
    }

    const browserSession = await browserClient.call<BrowserSessionRecord>(
      'browser.launch',
      {
        sessionName: input.sessionName ?? 'default-visible-session',
        profileStrategy: 'isolated',
        baseUrl: targetUrl,
      },
    );

    await withRetry(5, async () => {
      const health = await remoteClient.call<{ ok: boolean; status?: number }>(
        'remote.project.health',
        {
          url: targetUrl,
          timeoutMs: 3000,
        },
      );
      if (!health.ok) {
        throw new Error(
          `Health check failed for ${targetUrl}; status=${health.status ?? 'unknown'}`,
        );
      }
      return health;
    });

    const snapshot = await browserClient.call<{
      bundlePath: string;
      bundleSummary: string;
    }>('browser.snapshot', {
      sessionId: browserSession.id,
      format: 'screenshot',
    });

    const evidenceBundle = createEvidenceBundle(
      'Launch-and-probe run complete',
      [
        {
          kind: 'report',
          path: snapshot.bundlePath,
          description: snapshot.bundleSummary,
        },
      ],
      [
        `project=${remoteProject.id}`,
        `session=${browserSession.id}`,
        `url=${targetUrl}`,
      ],
    );

    return {
      remoteProject,
      browserSession,
      evidenceBundle,
    };
  } finally {
    await remoteClient.close();
    await browserClient.close();
  }
}

async function main(): Promise<void> {
  const cwd = process.argv[2] ?? process.cwd();
  const result = await runLaunchAndProbe({
    cwd,
    task: 'launch_and_probe',
    sessionName: 'cli-launch-and-probe',
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}
`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
