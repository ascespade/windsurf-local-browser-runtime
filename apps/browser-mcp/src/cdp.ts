import { setTimeout as delay } from 'node:timers/promises';
import { randomUUID } from 'node:crypto';
import type { BrowserTarget } from '@wlbr/target-resolver';

interface JsonObject {
  [key: string]: unknown;
}

interface DevtoolsVersion {
  webSocketDebuggerUrl: string;
}

interface PendingCall {
  resolve: (_value: unknown) => void;
  reject: (_error: Error) => void;
}

export interface ConsoleEvent {
  type: 'log' | 'warn' | 'error' | 'info' | 'debug';
  timestamp: number;
  message: string;
  source?: string | undefined;
  lineNumber?: number | undefined;
  columnNumber?: number | undefined;
}

export interface NetworkEvent {
  type: 'request' | 'response';
  timestamp: number;
  url: string;
  method?: string | undefined;
  status?: number | undefined;
  mimeType?: string | undefined;
  requestId: string;
}

interface EventListeners {
  onConsole?: (event: ConsoleEvent) => void;
  onNetwork?: (event: NetworkEvent) => void;
}

export class CdpClient {
  private socket: WebSocket | undefined;
  private nextId = 1;
  private readonly pending = new Map<number, PendingCall>();
  private eventListeners: EventListeners = {};

  constructor(private readonly wsUrl: string) {}

  setEventListeners(listeners: EventListeners): void {
    this.eventListeners = listeners;
  }

  async connect(): Promise<void> {
    this.socket = new WebSocket(this.wsUrl);
    await new Promise<void>((resolve, reject) => {
      const socket = this.socket;
      if (!socket) {
        reject(new Error('WebSocket not created'));
        return;
      }
      socket.addEventListener('open', () => resolve(), { once: true });
      socket.addEventListener(
        'error',
        (_error) => reject(new Error(`Failed to connect to CDP socket: ${this.wsUrl}`)),
        { once: true },
      );
      socket.addEventListener('message', (event) => this.handleMessage(String(event.data)));
    });
  }

  async close(): Promise<void> {
    if (!this.socket) return;
    this.socket.close();
    this.socket = undefined;
  }

  async send<T = unknown>(method: string, params?: JsonObject): Promise<T> {
    const id = this.nextId++;
    const payload = JSON.stringify({
      id,
      method,
      params,
    });

    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error('CDP socket is not connected.');
    }

    const promise = new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      });
    });

    socket.send(payload);
    return promise;
  }

  private handleMessage(raw: string): void {
    const message = JSON.parse(raw) as { id?: number; result?: unknown; error?: { message?: string }; method?: string; params?: unknown };
    
    // Handle event notifications (no id field)
    if (!message.id && message.method) {
      this.handleEvent(message.method, message.params);
      return;
    }
    
    // Handle method call responses
    if (!message.id) {
      return;
    }

    const pending = this.pending.get(message.id);
    if (!pending) {
      return;
    }

    this.pending.delete(message.id);

    if (message.error) {
      pending.reject(new Error(message.error.message ?? 'Unknown CDP error'));
      return;
    }

    pending.resolve(message.result);
  }

  private handleEvent(method: string, params: unknown): void {
    switch (method) {
      case 'Runtime.consoleAPICalled':
        this.handleConsoleEvent(params as any);
        break;
      case 'Network.requestWillBeSent':
        this.handleNetworkRequest(params as any);
        break;
      case 'Network.responseReceived':
        this.handleNetworkResponse(params as any);
        break;
    }
  }

  private handleConsoleEvent(params: { type: string; args: Array<{ value?: string }>; timestamp: number; stackTrace?: { callFrames: Array<{ functionName: string; lineNumber: number; columnNumber: number }> } }): void {
    const consoleEvent: ConsoleEvent = {
      type: params.type as any,
      timestamp: params.timestamp,
      message: params.args.map(arg => arg.value || '').join(' '),
      source: params.stackTrace?.callFrames[0]?.functionName,
      lineNumber: params.stackTrace?.callFrames[0]?.lineNumber,
      columnNumber: params.stackTrace?.callFrames[0]?.columnNumber,
    };
    
    this.eventListeners.onConsole?.(consoleEvent);
  }

  private handleNetworkRequest(params: { requestId: string; request: { url: string; method: string }; timestamp: number }): void {
    const networkEvent: NetworkEvent = {
      type: 'request',
      timestamp: params.timestamp,
      url: params.request.url,
      method: params.request.method,
      requestId: params.requestId,
    };
    
    this.eventListeners.onNetwork?.(networkEvent);
  }

  private handleNetworkResponse(params: { requestId: string; response: { url: string; status: number; mimeType: string }; timestamp: number }): void {
    const networkEvent: NetworkEvent = {
      type: 'response',
      timestamp: params.timestamp,
      url: params.response.url,
      status: params.response.status,
      mimeType: params.response.mimeType,
      requestId: params.requestId,
    };
    
    this.eventListeners.onNetwork?.(networkEvent);
  }
}

export async function fetchVersion(debugPort: number): Promise<DevtoolsVersion> {
  const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
  if (!response.ok) {
    throw new Error(`Unable to query DevTools version endpoint on port ${debugPort}`);
  }
  return (await response.json()) as DevtoolsVersion;
}

export async function listTargets(debugPort: number): Promise<BrowserTarget[]> {
  const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
  if (!response.ok) {
    throw new Error(`Unable to list DevTools targets on port ${debugPort}`);
  }
  const rawTargets = (await response.json()) as Array<{ id: string; title: string; url: string; type?: string }>;
  return rawTargets.map((target) => ({
    id: target.id,
    title: target.title,
    url: target.url,
    type: target.type,
  }));
}

export async function waitForDevtools(debugPort: number, timeoutMs = 10000): Promise<DevtoolsVersion> {
  const startedAt = Date.now();
  let lastError: unknown;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      return await fetchVersion(debugPort);
    } catch (error) {
      lastError = error;
      await delay(250);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Timed out waiting for DevTools on port ${debugPort}`);
}

export async function attachToTarget(debugPort: number, targetId: string): Promise<CdpClient> {
  const response = await fetch(`http://127.0.0.1:${debugPort}/json/activate/${targetId}`);
  if (!response.ok) {
    throw new Error(`Unable to activate DevTools target ${targetId}`);
  }

  const attachResponse = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
  if (!attachResponse.ok) {
    throw new Error('Unable to re-fetch targets after activation');
  }
  const targets = (await attachResponse.json()) as Array<{ id: string; webSocketDebuggerUrl?: string }>;
  const target = targets.find((item) => item.id === targetId);
  if (!target?.webSocketDebuggerUrl) {
    throw new Error(`No webSocketDebuggerUrl available for target ${targetId}`);
  }

  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();
  await client.send('Runtime.enable');
  await client.send('Page.enable');
  await client.send('Network.enable');
  await client.send('Console.enable');
  return client;
}
