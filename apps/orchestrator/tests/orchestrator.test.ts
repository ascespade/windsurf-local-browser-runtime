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
        } else if (req.method === 'slow.method') {
          setTimeout(() => {
            process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { echo: req.method } }) + '\\n');
          }, 250);
        } else {
          process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { echo: req.method, params: req.params } }) + '\\n');
        }
      } catch {}
    }
    idx = buffer.indexOf('\\n');
  }
});
`;

const EXIT_SERVER = `
process.stdin.setEncoding('utf8');
process.stdin.on('data', () => {
  process.exit(7);
});
`;

describe('Orchestrator', () => {
  describe('LocalToolClient', () => {
    test('should be importable from source', async () => {
      const { LocalToolClient } = await import('../src/client.ts');
      assert.equal(typeof LocalToolClient, 'function');
    });

    test('should have call method', async () => {
      const { LocalToolClient } = await import('../src/client.ts');
      assert.equal(typeof LocalToolClient.prototype.call, 'function');
    });

    test('should have close method', async () => {
      const { LocalToolClient } = await import('../src/client.ts');
      assert.equal(typeof LocalToolClient.prototype.close, 'function');
    });

    test('should send JSON-RPC request and receive response', async () => {
      const { LocalToolClient } = await import('../src/client.ts');
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
      const { LocalToolClient } = await import('../src/client.ts');
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
      const { LocalToolClient } = await import('../src/client.ts');
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
      const { LocalToolClient } = await import('../src/client.ts');
      const client = new LocalToolClient('node', ['-e', ECHO_SERVER]);
      try {
        const result = await client.call<{ echo: string; params: unknown }>('no.params');
        assert.equal(result.echo, 'no.params');
      } finally {
        await client.close();
      }
    });

    test('should time out slow requests', async () => {
      const { LocalToolClient } = await import('../src/client.ts');
      const client = new LocalToolClient('node', ['-e', ECHO_SERVER], {
        requestTimeoutMs: 50,
      });
      try {
        await assert.rejects(
          () => client.call('slow.method'),
          (err: Error) => {
            assert.ok(err.message.includes('timed out'));
            return true;
          },
        );
      } finally {
        await client.close();
      }
    });

    test('should reject pending calls when child exits unexpectedly', async () => {
      const { LocalToolClient } = await import('../src/client.ts');
      const client = new LocalToolClient('node', ['-e', EXIT_SERVER], {
        requestTimeoutMs: 500,
      });
      try {
        await assert.rejects(
          () => client.call('exit.now'),
          (err: Error) => {
            assert.ok(err.message.includes('child exited'));
            return true;
          },
        );
      } finally {
        await client.close();
      }
    });

    test('close should reject future calls', async () => {
      const { LocalToolClient } = await import('../src/client.ts');
      const client = new LocalToolClient('node', ['-e', ECHO_SERVER]);
      await client.close();
      await assert.rejects(
        () => client.call('after.close'),
        (err: Error) => {
          assert.ok(err.message.includes('closed'));
          return true;
        },
      );
    });
  });

  describe('runLaunchAndProbe', () => {
    test('should be importable from source', async () => {
      const { runLaunchAndProbe } = await import('../dist/index.js');
      assert.equal(typeof runLaunchAndProbe, 'function');
    });
  });
});
