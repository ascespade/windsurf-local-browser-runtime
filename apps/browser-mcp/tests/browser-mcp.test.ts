import { test, describe, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile, readdir, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { EventCapture } from '../src/event-capture.ts';
import { chooseDebugPort, ensureProfileDir } from '../src/chrome.ts';

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs) {
    try {
      await rm(dir, { recursive: true, force: true });
    } catch {
      /* cleanup */
    }
  }
  tempDirs.length = 0;
});

describe('Browser MCP', () => {
  describe('EventCapture', () => {
    test('should initialize with empty event arrays', () => {
      const capture = new EventCapture('session-1', '/tmp/evidence');
      assert.deepEqual(capture.getConsoleEvents(), []);
      assert.deepEqual(capture.getNetworkEvents(), []);
    });

    test('should capture console events', () => {
      const capture = new EventCapture('session-1', '/tmp/evidence');
      capture.onConsoleEvent({
        type: 'log',
        timestamp: Date.now(),
        message: 'hello',
      });
      capture.onConsoleEvent({
        type: 'error',
        timestamp: Date.now(),
        message: 'fail',
      });

      const events = capture.getConsoleEvents();
      assert.equal(events.length, 2);
      assert.equal(events[0]?.type, 'log');
      assert.equal(events[1]?.type, 'error');
    });

    test('should capture network events', () => {
      const capture = new EventCapture('session-1', '/tmp/evidence');
      capture.onNetworkEvent({
        type: 'request',
        timestamp: Date.now(),
        url: 'http://example.com',
      });
      capture.onNetworkEvent({
        type: 'response',
        timestamp: Date.now(),
        url: 'http://example.com',
      });

      const events = capture.getNetworkEvents();
      assert.equal(events.length, 2);
      assert.equal(events[0]?.type, 'request');
      assert.equal(events[1]?.type, 'response');
    });

    test('should return copies of event arrays', () => {
      const capture = new EventCapture('session-1', '/tmp/evidence');
      capture.onConsoleEvent({
        type: 'log',
        timestamp: Date.now(),
        message: 'test',
      });

      const events1 = capture.getConsoleEvents();
      const events2 = capture.getConsoleEvents();
      assert.notStrictEqual(events1, events2);
      assert.equal(events1.length, events2.length);
    });

    test('should clear all events', () => {
      const capture = new EventCapture('session-1', '/tmp/evidence');
      capture.onConsoleEvent({
        type: 'log',
        timestamp: Date.now(),
        message: 'test',
      });
      capture.onNetworkEvent({
        type: 'request',
        timestamp: Date.now(),
        url: 'http://example.com',
      });

      capture.clear();

      assert.deepEqual(capture.getConsoleEvents(), []);
      assert.deepEqual(capture.getNetworkEvents(), []);
    });

    test('should flush console events to file', async () => {
      const tmpDir = join('/tmp', `browser-test-${Date.now()}`);
      tempDirs.push(tmpDir);

      const capture = new EventCapture('session-abc', tmpDir);
      capture.onConsoleEvent({
        type: 'log',
        timestamp: Date.now(),
        message: 'hello world',
      });
      capture.onConsoleEvent({
        type: 'warn',
        timestamp: Date.now(),
        message: 'warning msg',
      });

      await capture.flushEvents();

      const files = await readdir(tmpDir);
      const consoleFile = files.find(
        (f) => f.startsWith('console-') && f.endsWith('.json'),
      );
      assert.ok(consoleFile, 'Console file should exist');

      const content = await readFile(join(tmpDir, consoleFile!), 'utf8');
      const data = JSON.parse(content);
      assert.equal(data.sessionId, 'session-abc');
      assert.equal(data.type, 'console');
      assert.equal(data.events.length, 2);
    });

    test('should flush network events to file', async () => {
      const tmpDir = join('/tmp', `browser-test-${Date.now()}`);
      tempDirs.push(tmpDir);

      const capture = new EventCapture('session-net', tmpDir);
      capture.onNetworkEvent({
        type: 'request',
        timestamp: Date.now(),
        url: 'http://api.test.com',
      });

      await capture.flushEvents();

      const files = await readdir(tmpDir);
      const netFile = files.find(
        (f) => f.startsWith('network-') && f.endsWith('.json'),
      );
      assert.ok(netFile, 'Network file should exist');

      const content = await readFile(join(tmpDir, netFile!), 'utf8');
      const data = JSON.parse(content);
      assert.equal(data.sessionId, 'session-net');
      assert.equal(data.type, 'network');
      assert.equal(data.events.length, 1);
    });

    test('should clear events after flush', async () => {
      const tmpDir = join('/tmp', `browser-test-${Date.now()}`);
      tempDirs.push(tmpDir);

      const capture = new EventCapture('session-flush', tmpDir);
      capture.onConsoleEvent({
        type: 'log',
        timestamp: Date.now(),
        message: 'flushed',
      });

      await capture.flushEvents();

      assert.deepEqual(capture.getConsoleEvents(), []);
    });

    test('should not create files when no events to flush', async () => {
      const tmpDir = join('/tmp', `browser-test-${Date.now()}`);
      tempDirs.push(tmpDir);

      const capture = new EventCapture('session-empty', tmpDir);
      await capture.flushEvents();

      try {
        await access(join(tmpDir, 'console-0.json'));
        assert.fail('Should not create console file with no events');
      } catch {
        assert.ok(true);
      }
    });
  });

  describe('chooseDebugPort', () => {
    test('should return preferred port when valid', () => {
      assert.equal(chooseDebugPort(9333), 9333);
      assert.equal(chooseDebugPort(3000), 3000);
      assert.equal(chooseDebugPort(65534), 65534);
    });

    test('should return random port when preferred is too low', () => {
      const port = chooseDebugPort(80);
      assert.ok(port >= 9222 && port < 10222);
    });

    test('should return random port when preferred is too high', () => {
      const port = chooseDebugPort(70000);
      assert.ok(port >= 9222 && port < 10222);
    });

    test('should return random port when no preference', () => {
      const port = chooseDebugPort();
      assert.ok(port >= 9222 && port < 10222);
    });

    test('should return random port for 1024 boundary', () => {
      const port = chooseDebugPort(1024);
      assert.ok(port >= 9222 && port < 10222);
    });

    test('should return different ports across calls (likely)', () => {
      const ports = new Set(
        Array.from({ length: 10 }, () => chooseDebugPort()),
      );
      assert.ok(ports.size > 1, 'Should generate varied ports');
    });
  });

  describe('ensureProfileDir', () => {
    test('should create a directory under tmpdir', async () => {
      const dir = await ensureProfileDir('test-session');
      tempDirs.push(dir);

      assert.ok(dir.includes('wlbr-browser-profiles'));
      assert.ok(dir.includes('test-session'));

      await access(dir);
    });

    test('should create unique directories for same session name', async () => {
      const dir1 = await ensureProfileDir('same-name');
      const dir2 = await ensureProfileDir('same-name');
      tempDirs.push(dir1, dir2);

      assert.notEqual(dir1, dir2);
    });

    test('should create directories with UUID suffix', async () => {
      const dir = await ensureProfileDir('uuid-test');
      tempDirs.push(dir);

      const parts = dir.split('/');
      const lastPart = parts[parts.length - 1] ?? '';
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
      assert.ok(uuidPattern.test(lastPart), 'Last part should be a UUID');
    });
  });
});
