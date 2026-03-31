import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';

const ECHO_SERVER = `
process.stdin.setEncoding('utf8');
let buffer = '';
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let idx = buffer.indexOf('\\n');
  while (idx >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (line) {
      try {
        const req = JSON.parse(line);
        if (req.method === 'error.method') {
          process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, error: { code: 'test_error', message: 'intentional error' } }) + '\\n');
        } else {
          process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { echo: req.method, params: req.params } }) + '\\n');
        }
      } catch {}
    }
    idx = buffer.indexOf('\\n');
  }
});
`;

describe('Orchestrator', () => {
  describe('LocalToolClient', () => {
    test('should be importable from source', async () => {
      const { LocalToolClient } = await import('../dist/client.js');
      assert.equal(typeof LocalToolClient, 'function');
    });

    test('should have call method', async () => {
      const { LocalToolClient } = await import('../dist/client.js');
      assert.equal(typeof LocalToolClient.prototype.call, 'function');
    });

    test('should have close method', async () => {
      const { LocalToolClient } = await import('../dist/client.js');
      assert.equal(typeof LocalToolClient.prototype.close, 'function');
    });

    test('should send JSON-RPC request and receive response', async () => {
      const { LocalToolClient } = await import('../dist/client.js');
      const client = new LocalToolClient('node', ['-e', ECHO_SERVER]);
      try {
        const result = await client.call<{
          echo: string;
          params: Record<string, unknown>;
        }>('test.method', { key: 'value' });
        assert.equal(result.echo, 'test.method');
        assert.deepEqual(result.params, { key: 'value' });
      } finally {
        await client.close();
      }
    });

    test('should handle error responses', async () => {
      const { LocalToolClient } = await import('../dist/client.js');
      const client = new LocalToolClient('node', ['-e', ECHO_SERVER]);
      try {
        await assert.rejects(
          () => client.call('error.method'),
          (err: Error) => {
            assert.ok(err.message.includes('intentional error'));
            return true;
          },
        );
      } finally {
        await client.close();
      }
    });

    test('should handle multiple concurrent calls', async () => {
      const { LocalToolClient } = await import('../dist/client.js');
      const client = new LocalToolClient('node', ['-e', ECHO_SERVER]);
      try {
        const [r1, r2, r3] = await Promise.all([
          client.call<{ echo: string }>('method.1'),
          client.call<{ echo: string }>('method.2'),
          client.call<{ echo: string }>('method.3'),
        ]);
        assert.equal(r1.echo, 'method.1');
        assert.equal(r2.echo, 'method.2');
        assert.equal(r3.echo, 'method.3');
      } finally {
        await client.close();
      }
    });

    test('should handle call with no params', async () => {
      const { LocalToolClient } = await import('../dist/client.js');
      const client = new LocalToolClient('node', ['-e', ECHO_SERVER]);
      try {
        const result = await client.call<{ echo: string; params: unknown }>(
          'no.params',
        );
        assert.equal(result.echo, 'no.params');
      } finally {
        await client.close();
      }
    });

    test('close should terminate child process', async () => {
      const { LocalToolClient } = await import('../dist/client.js');
      const client = new LocalToolClient('node', ['-e', ECHO_SERVER]);
      await client.close();
      // After close, further calls should not resolve normally
      // (process is killed, so no response will come)
    });
  });

  describe('runLaunchAndProbe', () => {
    test('should be importable from source', async () => {
      const { runLaunchAndProbe } = await import('../dist/index.js');
      assert.equal(typeof runLaunchAndProbe, 'function');
    });
  });
});
