import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { planClick, planType, planWait, planScroll, planHover } from '@wlbr/action-engine';
import { createEvidenceBundle, writeEvidencePointer } from '@wlbr/audit-core';
import type {
  BrowserAttachInput,
  BrowserClickInput,
  BrowserCloseSessionInput,
  BrowserEvalInput,
  BrowserLaunchInput,
  BrowserOpenInput,
  BrowserSessionRecord,
  BrowserSnapshotInput,
  BrowserTypeInput,
  BrowserWaitForInput,
} from '@wlbr/protocol';
import { FileBackedSessionStore } from '@wlbr/session-store';
import { resolveBestTarget, type BrowserTarget } from '@wlbr/target-resolver';
import { attachToTarget, listTargets, waitForDevtools, type ConsoleEvent, type NetworkEvent } from './cdp.js';
import { launchChromeVisible } from './chrome.js';
import { EventCapture } from './event-capture.js';

interface BrowserRuntimeOptions {
  rootDir: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function metadataPath(rootDir: string): string {
  return resolve(rootDir, 'state', 'sessions.json');
}

function sessionRoot(rootDir: string, sessionId: string): string {
  return resolve(rootDir, 'sessions', sessionId);
}

function buildSessionRecord(
  sessionId: string,
  name: string,
  rootDir: string,
  profilePath: string,
): BrowserSessionRecord {
  const timestamp = nowIso();
  const root = sessionRoot(rootDir, sessionId);
  return {
    id: sessionId,
    name,
    state: 'created',
    runtimeEnvironment: 'local',
    profilePath,
    browserProcessId: undefined,
    debugPort: undefined,
    browserWsUrl: undefined,
    activeTargetId: undefined,
    lastKnownUrl: undefined,
    paths: {
      rootDir: root,
      profileDir: profilePath,
      evidenceDir: join(root, 'evidence'),
      metadataPath: join(root, 'session.json'),
    },
    tags: undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export class BrowserRuntime {
  private readonly store: FileBackedSessionStore;
  private readonly clients = new Map<string, Awaited<ReturnType<typeof attachToTarget>>>();
  private readonly eventCaptures = new Map<string, EventCapture>();

  constructor(private readonly options: BrowserRuntimeOptions) {
    this.store = new FileBackedSessionStore(metadataPath(options.rootDir));
  }

  async init(): Promise<void> {
    await mkdir(this.options.rootDir, { recursive: true });
    await this.store.init();
  }

  listSessions(): BrowserSessionRecord[] {
    return this.store.list();
  }

  async launch(input: BrowserLaunchInput): Promise<BrowserSessionRecord> {
    const sessionId = randomUUID();
    const launched = await launchChromeVisible(input.sessionName, input.debugPort);
    const record = buildSessionRecord(sessionId, input.sessionName, this.options.rootDir, launched.profileDir);
    record.browserProcessId = launched.process.pid;
    record.debugPort = launched.debugPort;
    record.state = 'launching';
    this.store.upsert(record);

    // Initialize event capture for this session
    const eventCapture = new EventCapture(sessionId, record.paths?.evidenceDir || '');
    this.eventCaptures.set(sessionId, eventCapture);

    await waitForDevtools(launched.debugPort);
    const targets = await listTargets(launched.debugPort);
    const target = resolveBestTarget(targets);
    if (target) {
      record.activeTargetId = target.id;
      record.lastKnownUrl = target.url;
    }
    record.state = 'ready';
    this.store.upsert(record);

    if (input.baseUrl) {
      await this.open({ sessionId, url: input.baseUrl });
      return this.assertSession(sessionId);
    }

    return this.assertSession(sessionId);
  }

  async attach(input: BrowserAttachInput): Promise<BrowserSessionRecord> {
    this.assertSession(input.sessionId);
    await waitForDevtools(input.debugPort);
    this.store.patch(input.sessionId, {
      debugPort: input.debugPort,
      state: 'ready',
    });
    return this.assertSession(input.sessionId);
  }

  async open(input: BrowserOpenInput): Promise<{ session: BrowserSessionRecord; target: BrowserTarget }> {
    this.assertSession(input.sessionId);
    const session = this.assertSession(input.sessionId);
    const debugPort = this.requireDebugPort(session);

    const response = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(input.url)}`);
    if (!response.ok) {
      throw new Error(`Unable to open URL ${input.url} in browser session ${input.sessionId}`);
    }

    const target = (await response.json()) as BrowserTarget & { webSocketDebuggerUrl?: string };
    this.store.patch(input.sessionId, {
      activeTargetId: target.id,
      lastKnownUrl: input.url,
      state: 'ready',
    });

    return {
      session: this.assertSession(input.sessionId),
      target,
    };
  }

  async click(input: BrowserClickInput): Promise<{ ok: true; selector: string }> {
    const session = this.assertSession(input.sessionId);
    const plan = planClick(input);
    const client = await this.attachClient(session);
    await this.waitUntilResolved(client, plan.jsResolver, plan.timeoutMs);
    await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const node = ${plan.jsResolver};
          if (!node) return { ok: false, reason: 'element_not_found' };
          if (node instanceof HTMLElement) node.click();
          return { ok: true };
        })()
      `,
      awaitPromise: true,
      returnByValue: true,
    });
    return { ok: true, selector: plan.selector };
  }

  async type(input: BrowserTypeInput): Promise<{ ok: true; selector: string }> {
    const session = this.assertSession(input.sessionId);
    const plan = planType(input);
    const client = await this.attachClient(session);
    await this.waitUntilResolved(client, plan.jsResolver, plan.timeoutMs);
    const valueLiteral = JSON.stringify(plan.payload ?? '');
    await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const node = ${plan.jsResolver};
          if (!node) return { ok: false, reason: 'element_not_found' };
          if ('focus' in node) node.focus();
          if (${JSON.stringify(input.clearFirst ?? true)} && 'value' in node) node.value = '';
          if ('value' in node) {
            node.value = ${valueLiteral};
            node.dispatchEvent(new Event('input', { bubbles: true }));
            node.dispatchEvent(new Event('change', { bubbles: true }));
          }
          return { ok: true };
        })()
      `,
      awaitPromise: true,
      returnByValue: true,
    });
    return { ok: true, selector: plan.selector };
  }

  async waitFor(input: BrowserWaitForInput): Promise<{ ok: true; selector: string }> {
    const session = this.assertSession(input.sessionId);
    const plan = planWait(input.target, input.timeoutMs ?? 10000);
    const client = await this.attachClient(session);
    await this.waitUntilResolved(client, plan.jsResolver, plan.timeoutMs);
    return { ok: true, selector: plan.selector };
  }

  async evaluate(input: BrowserEvalInput): Promise<unknown> {
    const session = this.assertSession(input.sessionId);
    const client = await this.attachClient(session);
    const result = await client.send<{ result?: { value?: unknown } }>('Runtime.evaluate', {
      expression: input.expression,
      awaitPromise: input.awaitPromise ?? true,
      returnByValue: true,
    });
    return result.result?.value;
  }

  async scroll(input: { sessionId: string; target: any; direction?: 'up' | 'down' | 'left' | 'right'; amount?: number; timeoutMs?: number }): Promise<{ ok: true; selector: string }> {
    const session = this.assertSession(input.sessionId);
    const plan = planScroll(input.target, input.direction, input.amount);
    const client = await this.attachClient(session);
    await this.waitUntilResolved(client, plan.jsResolver, plan.timeoutMs);
    const { direction, amount } = JSON.parse(plan.payload || '{}');
    await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const node = ${plan.jsResolver};
          if (!node) return { ok: false, reason: 'element_not_found' };
          const deltaX = ${direction === 'left' ? -amount : direction === 'right' ? amount : 0};
          const deltaY = ${direction === 'up' ? -amount : direction === 'down' ? amount : 0};
          node.scrollBy({ top: deltaY, left: deltaX, behavior: 'smooth' });
          return { ok: true };
        })()
      `,
      awaitPromise: true,
      returnByValue: true,
    });
    return { ok: true, selector: plan.selector };
  }

  async hover(input: { sessionId: string; target: any; timeoutMs?: number }): Promise<{ ok: true; selector: string }> {
    const session = this.assertSession(input.sessionId);
    const plan = planHover(input.target);
    const client = await this.attachClient(session);
    await this.waitUntilResolved(client, plan.jsResolver, plan.timeoutMs);
    await client.send('Runtime.evaluate', {
      expression: `
        (() => {
          const node = ${plan.jsResolver};
          if (!node) return { ok: false, reason: 'element_not_found' };
          const event = new MouseEvent('mouseover', { bubbles: true, cancelable: true });
          node.dispatchEvent(event);
          return { ok: true };
        })()
      `,
      awaitPromise: true,
      returnByValue: true,
    });
    return { ok: true, selector: plan.selector };
  }

  async snapshot(input: BrowserSnapshotInput): Promise<{ bundlePath: string; bundleSummary: string }> {
    const session = this.assertSession(input.sessionId);
    const client = await this.attachClient(session);
    const evidenceDir = this.requireEvidenceDir(session);

    // Flush events before taking snapshot
    const eventCapture = this.eventCaptures.get(session.id);
    if (eventCapture) {
      await eventCapture.flushEvents();
    }

    const pointers = [];
    if (input.format === 'dom') {
      const domResult = await client.send<{ result?: { value?: string } }>('Runtime.evaluate', {
        expression: 'document.documentElement.outerHTML',
        awaitPromise: false,
        returnByValue: true,
      });
      pointers.push(
        await writeEvidencePointer(
          evidenceDir,
          'dom',
          `dom-${Date.now()}`,
          domResult.result?.value ?? '',
          'DOM snapshot',
        ),
      );
    } else {
      const screenshot = await client.send<{ data: string }>('Page.captureScreenshot', {
        format: 'png',
      });
      pointers.push(
        await writeEvidencePointer(
          evidenceDir,
          'screenshot',
          `screenshot-${Date.now()}`,
          screenshot.data,
          'Visible page screenshot',
        ),
      );
    }

    const bundle = createEvidenceBundle(`Snapshot captured (${input.format})`, pointers, [
      `session=${session.id}`,
      `format=${input.format}`,
      `url=${session.lastKnownUrl ?? 'unknown'}`,
    ]);
    const bundlePath = join(evidenceDir, `bundle-${bundle.id}.json`);
    await writeFile(bundlePath, JSON.stringify(bundle, null, 2), 'utf8');
    return { bundlePath, bundleSummary: bundle.summary };
  }

  async flushEvents(sessionId: string): Promise<{ ok: true; flushedEvents: { console: number; network: number } }> {
    const session = this.assertSession(sessionId);
    const eventCapture = this.eventCaptures.get(sessionId);
    if (!eventCapture) {
      return { ok: true, flushedEvents: { console: 0, network: 0 } };
    }

    const consoleCount = eventCapture.getConsoleEvents().length;
    const networkCount = eventCapture.getNetworkEvents().length;
    
    await eventCapture.flushEvents();
    
    return { ok: true, flushedEvents: { console: consoleCount, network: networkCount } };
  }

  getSessionEvents(sessionId: string): { console: ConsoleEvent[]; network: NetworkEvent[] } {
    const eventCapture = this.eventCaptures.get(sessionId);
    if (!eventCapture) {
      return { console: [], network: [] };
    }
    
    return {
      console: eventCapture.getConsoleEvents(),
      network: eventCapture.getNetworkEvents(),
    };
  }

  async closeSession(input: BrowserCloseSessionInput): Promise<{ ok: true }> {
    const session = this.assertSession(input.sessionId);
    
    // Flush any remaining events before closing
    const eventCapture = this.eventCaptures.get(session.id);
    if (eventCapture) {
      await eventCapture.flushEvents();
      this.eventCaptures.delete(session.id);
    }
    
    const pid = session.browserProcessId;
    if (pid) {
      try {
        process.kill(pid);
      } catch {
        // process may already be gone
      }
    }
    const client = this.clients.get(input.sessionId);
    if (client) {
      await client.close();
      this.clients.delete(input.sessionId);
    }
    this.store.patch(input.sessionId, { state: 'closed' });
    return { ok: true };
  }

  private assertSession(sessionId: string): BrowserSessionRecord {
    const session = this.store.get(sessionId);
    if (!session) {
      throw new Error(`Browser session ${sessionId} not found`);
    }
    return session;
  }

  private requireDebugPort(session: BrowserSessionRecord): number {
    if (!session.debugPort) {
      throw new Error(`Session ${session.id} does not have a debug port`);
    }
    return session.debugPort;
  }

  private requireEvidenceDir(session: BrowserSessionRecord): string {
    if (!session.paths?.evidenceDir) {
      throw new Error(`Session ${session.id} does not have evidence paths`);
    }
    return session.paths.evidenceDir;
  }

  private async attachClient(session: BrowserSessionRecord) {
    const existing = this.clients.get(session.id);
    if (existing) {
      return existing;
    }
    const debugPort = this.requireDebugPort(session);
    const targets = await listTargets(debugPort);
    const target = resolveBestTarget(targets, session.lastKnownUrl);
    if (!target) {
      throw new Error(`No attachable targets available for session ${session.id}`);
    }

    const client = await attachToTarget(debugPort, target.id);
    
    // Set up event capture for this client
    const eventCapture = this.eventCaptures.get(session.id);
    if (eventCapture) {
      client.setEventListeners({
        onConsole: (event: ConsoleEvent) => eventCapture.onConsoleEvent(event),
        onNetwork: (event: NetworkEvent) => eventCapture.onNetworkEvent(event),
      });
    }
    
    this.clients.set(session.id, client);

    this.store.patch(session.id, {
      activeTargetId: target.id,
      lastKnownUrl: target.url,
      state: 'connected',
    });

    return client;
  }

  private async waitUntilResolved(
    client: Awaited<ReturnType<typeof attachToTarget>>,
    resolverExpression: string,
    timeoutMs: number,
  ): Promise<void> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const result = await client.send<{ result?: { value?: unknown } }>('Runtime.evaluate', {
        expression: `Boolean(${resolverExpression})`,
        awaitPromise: false,
        returnByValue: true,
      });

      if (result.result?.value === true) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    throw new Error(`Timed out waiting for target resolution after ${timeoutMs}ms`);
  }
}
