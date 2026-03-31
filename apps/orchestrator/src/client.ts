import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string;
  method: string;
  params?: Record<string, unknown> | undefined;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: string;
  result?: unknown;
  error?: { code?: string; message?: string };
}

interface LocalToolClientOptions {
  cwd?: string;
  requestTimeoutMs?: number;
}

interface PendingRequest {
  resolve: (response: JsonRpcResponse) => void;
  timer?: NodeJS.Timeout;
}

export class LocalToolClient {
  private readonly child: ChildProcess;
  private readonly requestTimeoutMs: number;
  private nextId = 1;
  private readonly pending = new Map<string, PendingRequest>();
  private buffer = '';
  private closed = false;

  constructor(command: string, args: string[], options: LocalToolClientOptions = {}) {
    const { cwd = process.cwd(), requestTimeoutMs = 15_000 } = options;
    this.requestTimeoutMs = requestTimeoutMs;
    this.child = spawn(command, args, {
      cwd,
      stdio: 'pipe',
      shell: false,
    });

    this.child.stdout?.setEncoding('utf8');
    this.child.stdout?.on('data', (chunk: string) => {
      this.buffer += chunk;
      let newlineIndex = this.buffer.indexOf('\n');
      while (newlineIndex >= 0) {
        const line = this.buffer.slice(0, newlineIndex).trim();
        this.buffer = this.buffer.slice(newlineIndex + 1);
        if (line) {
          try {
            const response = JSON.parse(line) as JsonRpcResponse;
            if (response.id && this.pending.has(String(response.id))) {
              const pending = this.pending.get(String(response.id));
              if (pending?.timer) {
                clearTimeout(pending.timer);
              }
              pending?.resolve(response);
              this.pending.delete(String(response.id));
            }
          } catch {
            // Non-JSON output from child process, ignore
          }
        }
        newlineIndex = this.buffer.indexOf('\n');
      }
    });

    this.child.on('error', (err) => {
      this.rejectAllPending('spawn_error', err.message);
    });

    this.child.on('exit', (code, signal) => {
      if (this.closed) {
        return;
      }
      const reason = signal ? `child exited via signal ${signal}` : `child exited with code ${code ?? 'unknown'}`;
      this.rejectAllPending('child_exit', reason);
    });
  }

  async call<T>(method: string, params?: Record<string, unknown>): Promise<T> {
    const id = String(this.nextId++);
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params: params ?? undefined,
    };

    if (this.closed || !this.child.stdin || this.child.stdin.destroyed) {
      throw new Error(`RPC client is closed; cannot call ${method}`);
    }

    const responsePromise = new Promise<JsonRpcResponse>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve({
          jsonrpc: '2.0',
          id,
          error: { code: 'timeout', message: `RPC call timed out: ${method}` },
        });
      }, this.requestTimeoutMs);
      this.pending.set(id, { resolve, timer });
    });

    this.child.stdin.write(`${JSON.stringify(request)}\n`);
    const response = await responsePromise;
    if (response.error) {
      throw new Error(response.error.message ?? `RPC error from ${method}`);
    }
    return response.result as T;
  }

  async close(): Promise<void> {
    this.closed = true;
    this.rejectAllPending('client_closed', 'RPC client closed');
    if (!this.child.killed) {
      this.child.kill();
    }
  }

  private rejectAllPending(code: string, message: string): void {
    for (const [id, pending] of this.pending) {
      if (pending.timer) {
        clearTimeout(pending.timer);
      }
      pending.resolve({
        jsonrpc: '2.0',
        id,
        error: { code, message },
      });
    }
    this.pending.clear();
  }
}
