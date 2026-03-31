import { spawn, ChildProcess } from 'node:child_process';

// @ts-nocheck
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

export class LocalToolClient {
  private readonly child: ChildProcess;
  private nextId = 1;
  private readonly pending = new Map<
    string,
    (response: JsonRpcResponse) => void
  >();
  private buffer = '';

  constructor(command: string, args: string[], cwd = process.cwd()) {
    this.child = spawn(command, args, {
      cwd,
      stdio: 'pipe',
      shell: false,
    });

    this.child.stdout?.setEncoding('utf8');
    this.child.stdout?.on('data', (chunk) => {
      this.buffer += chunk;
      let newlineIndex = this.buffer.indexOf('\n');
      while (newlineIndex >= 0) {
        const line = this.buffer.slice(0, newlineIndex).trim();
        this.buffer = this.buffer.slice(newlineIndex + 1);
        if (line) {
          const response = JSON.parse(line) as JsonRpcResponse;
          if (response.id && this.pending.has(String(response.id))) {
            this.pending.get(String(response.id))?.(response);
            this.pending.delete(String(response.id));
          }
        }
        newlineIndex = this.buffer.indexOf('\n');
      }
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

    const responsePromise = new Promise<JsonRpcResponse>((resolve) => {
      this.pending.set(id, resolve);
    });

    this.child.stdin?.write(`${JSON.stringify(request)}\n`);
    const response = await responsePromise;
    if (response.error) {
      throw new Error(response.error.message ?? `RPC error from ${method}`);
    }
    return response.result as T;
  }

  async close(): Promise<void> {
    this.child.kill();
  }
}
