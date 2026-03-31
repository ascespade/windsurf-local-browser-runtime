import { test, describe, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile, rm, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  summarizeEvidence,
  writeEvidencePointer,
  createEvidenceBundle,
} from '../index.js';
import type { EvidenceBundle, EvidencePointer } from '@wlbr/protocol';

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

describe('Audit Core', () => {
  describe('summarizeEvidence', () => {
    test('should produce summary with fact and pointer counts', () => {
      const bundle: EvidenceBundle = {
        id: 'ev_1',
        summary: 'Test run',
        pointers: [
          { kind: 'screenshot', path: '/tmp/a.png', description: 'shot' },
          { kind: 'console', path: '/tmp/b.txt', description: 'log' },
        ],
        facts: ['fact1', 'fact2', 'fact3'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const summary = summarizeEvidence(bundle);
      assert.ok(summary.includes('Test run'));
      assert.ok(summary.includes('facts=3'));
      assert.ok(summary.includes('pointers=2'));
    });

    test('should handle empty bundle', () => {
      const bundle: EvidenceBundle = {
        id: 'ev_empty',
        summary: 'Empty run',
        pointers: [],
        facts: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const summary = summarizeEvidence(bundle);
      assert.ok(summary.includes('Empty run'));
      assert.ok(summary.includes('facts=0'));
      assert.ok(summary.includes('pointers=0'));
    });

    test('should include summary text verbatim', () => {
      const bundle: EvidenceBundle = {
        id: 'ev_2',
        summary: 'Launch-and-probe run complete',
        pointers: [],
        facts: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const summary = summarizeEvidence(bundle);
      assert.ok(summary.startsWith('Launch-and-probe run complete'));
    });
  });

  describe('writeEvidencePointer', () => {
    test('should write text evidence to disk and return pointer', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'audit-test-'));
      tempDirs.push(tmpDir);

      const pointer = await writeEvidencePointer(
        tmpDir,
        'console',
        'test-log',
        'Hello console output',
        'Console log capture',
      );

      assert.equal(pointer.kind, 'console');
      assert.equal(pointer.description, 'Console log capture');
      assert.ok(pointer.path.endsWith('.txt'));

      const content = await readFile(pointer.path, 'utf8');
      assert.equal(content, 'Hello console output');
    });

    test('should write screenshot evidence with png extension', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'audit-test-'));
      tempDirs.push(tmpDir);

      const pointer = await writeEvidencePointer(
        tmpDir,
        'screenshot',
        'page',
        'base64data',
        'Page screenshot',
      );

      assert.equal(pointer.kind, 'screenshot');
      assert.ok(pointer.path.endsWith('.png'));
    });

    test('should write network evidence as text', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'audit-test-'));
      tempDirs.push(tmpDir);

      const pointer = await writeEvidencePointer(
        tmpDir,
        'network',
        'net-log',
        '{"url":"http://example.com"}',
        'Network capture',
      );

      assert.equal(pointer.kind, 'network');
      assert.ok(pointer.path.endsWith('.txt'));

      const content = await readFile(pointer.path, 'utf8');
      assert.ok(content.includes('example.com'));
    });

    test('should write dom evidence as text', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'audit-test-'));
      tempDirs.push(tmpDir);

      const pointer = await writeEvidencePointer(
        tmpDir,
        'dom',
        'dom-snap',
        '<html><body>test</body></html>',
        'DOM snapshot',
      );

      assert.equal(pointer.kind, 'dom');
      const content = await readFile(pointer.path, 'utf8');
      assert.ok(content.includes('<body>'));
    });

    test('should create nested directories for evidence path', async () => {
      const tmpDir = await mkdtemp(join(tmpdir(), 'audit-test-'));
      tempDirs.push(tmpDir);
      const nestedDir = join(tmpDir, 'sub', 'dir');

      const pointer = await writeEvidencePointer(
        nestedDir,
        'log',
        'nested',
        'log data',
        'Nested log',
      );

      const content = await readFile(pointer.path, 'utf8');
      assert.equal(content, 'log data');
    });
  });

  describe('createEvidenceBundle', () => {
    test('should create bundle with correct fields', () => {
      const now = new Date().toISOString();
      const bundle = createEvidenceBundle('Test summary', [], []);

      assert.ok(bundle.id.startsWith('ev_'));
      assert.equal(bundle.summary, 'Test summary');
      assert.deepEqual(bundle.pointers, []);
      assert.deepEqual(bundle.facts, []);
      assert.ok(bundle.createdAt.length > 0);
      assert.ok(bundle.updatedAt.length > 0);
    });

    test('should include pointers and facts', () => {
      const pointers: EvidencePointer[] = [
        { kind: 'screenshot', path: '/tmp/a.png', description: 'shot' },
      ];
      const facts = ['project=abc', 'session=xyz'];

      const bundle = createEvidenceBundle('With data', pointers, facts);

      assert.equal(bundle.pointers.length, 1);
      assert.equal(bundle.pointers[0]!.kind, 'screenshot');
      assert.equal(bundle.facts.length, 2);
      assert.ok(bundle.facts.includes('project=abc'));
    });

    test('should set createdAt and updatedAt to current time', () => {
      const before = Date.now();
      const bundle = createEvidenceBundle('Timestamp test', [], []);
      const after = Date.now();

      const created = new Date(bundle.createdAt).getTime();
      const updated = new Date(bundle.updatedAt).getTime();

      assert.ok(created >= before - 1000 && created <= after + 1000);
      assert.ok(updated >= before - 1000 && updated <= after + 1000);
    });

    test('should generate unique IDs for different bundles', async () => {
      const bundle1 = createEvidenceBundle('First', [], []);
      await new Promise((resolve) => setTimeout(resolve, 5));
      const bundle2 = createEvidenceBundle('Second', [], []);

      assert.notEqual(bundle1.id, bundle2.id);
    });

    test('should handle large fact arrays', () => {
      const facts = Array.from({ length: 100 }, (_, i) => `fact_${i}`);
      const bundle = createEvidenceBundle('Large bundle', [], facts);

      assert.equal(bundle.facts.length, 100);
      assert.ok(bundle.facts.includes('fact_0'));
      assert.ok(bundle.facts.includes('fact_99'));
    });
  });
});
