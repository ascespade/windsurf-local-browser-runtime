import type { StdioJsonRpcMessage } from '@wlbr/shared-types';

type Handler = (params: Record<string, unknown>) => Promise<unknown>;

export class StdioJsonRpcServer {
  private readonly handlers = new Map<string, Handler>();

  register(method: string, handler: Handler): void {
    this.handlers.set(method, handler);
  }

  listen(): void {
    let buffer = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      buffer += chunk;
      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (line) {
          void this.handleLine(line);
        }
        newlineIndex = buffer.indexOf('\n');
      }
    });
  }

  private async handleLine(line: string): Promise<void> {
    try {
      const message = JSON.parse(line) as StdioJsonRpcMessage;
      if (!message.method || typeof message.method !== 'string') {
        throw new Error('Missing JSON-RPC method');
      }
      const handler = this.handlers.get(message.method);
      if (!handler) {
        throw new Error(`No handler registered for method ${message.method}`);
      }
      const result = await handler(message.params ?? {});
      this.reply({
        jsonrpc: '2.0',
        id: message.id,
        result,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.reply({
        jsonrpc: '2.0',
        error: {
          code: 'handler_error',
          message: err.message,
        },
      });
    }
  }

  private reply(message: StdioJsonRpcMessage): void {
    process.stdout.write(`${JSON.stringify(message)}\n`);
  }
}
