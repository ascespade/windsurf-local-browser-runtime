import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { ConsoleEvent, NetworkEvent } from './cdp.js';

export class EventCapture {
  private consoleEvents: ConsoleEvent[] = [];
  private networkEvents: NetworkEvent[] = [];
  private readonly sessionId: string;
  private readonly evidenceDir: string;

  constructor(sessionId: string, evidenceDir: string) {
    this.sessionId = sessionId;
    this.evidenceDir = evidenceDir;
  }

  onConsoleEvent(event: ConsoleEvent): void {
    this.consoleEvents.push(event);
  }

  onNetworkEvent(event: NetworkEvent): void {
    this.networkEvents.push(event);
  }

  async flushEvents(): Promise<void> {
    await mkdir(this.evidenceDir, { recursive: true });

    if (this.consoleEvents.length > 0) {
      const consolePath = join(this.evidenceDir, `console-${Date.now()}.json`);
      await writeFile(consolePath, JSON.stringify({
        sessionId: this.sessionId,
        type: 'console',
        events: this.consoleEvents,
        capturedAt: new Date().toISOString(),
      }, null, 2));
      this.consoleEvents = [];
    }

    if (this.networkEvents.length > 0) {
      const networkPath = join(this.evidenceDir, `network-${Date.now()}.json`);
      await writeFile(networkPath, JSON.stringify({
        sessionId: this.sessionId,
        type: 'network',
        events: this.networkEvents,
        capturedAt: new Date().toISOString(),
      }, null, 2));
      this.networkEvents = [];
    }
  }

  getConsoleEvents(): ConsoleEvent[] {
    return [...this.consoleEvents];
  }

  getNetworkEvents(): NetworkEvent[] {
    return [...this.networkEvents];
  }

  clear(): void {
    this.consoleEvents = [];
    this.networkEvents = [];
  }
}
