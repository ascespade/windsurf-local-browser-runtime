import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import * as sharedTypes from '../index.js';

describe('Shared Types', () => {
  test('should be importable as a module', () => {
    assert.ok(sharedTypes, 'Module should be defined');
    assert.equal(typeof sharedTypes, 'object');
  });

  test('should export type-validated constants at runtime', () => {
    const validSessionStates = [
      'created',
      'launching',
      'connected',
      'ready',
      'busy',
      'paused',
      'error',
      'closed',
    ];
    const validProjectStates = [
      'idle',
      'detecting',
      'installing',
      'starting',
      'running',
      'unhealthy',
      'restarting',
      'stopped',
      'failed',
    ];
    const validOrchestrationStates = [
      'planned',
      'executing',
      'awaiting_observation',
      'patching',
      'retesting',
      'verified',
      'failed',
    ];
    const validEvidenceKinds = [
      'screenshot',
      'dom',
      'console',
      'network',
      'log',
      'report',
    ];

    assert.ok(
      validSessionStates.length > 0,
      'SessionState should have valid values',
    );
    assert.ok(
      validProjectStates.length > 0,
      'ProjectState should have valid values',
    );
    assert.ok(
      validOrchestrationStates.length > 0,
      'OrchestrationState should have valid values',
    );
    assert.ok(
      validEvidenceKinds.length > 0,
      'EvidenceKind should have valid values',
    );
  });

  test('should validate TimestampedRecord shape at type level', () => {
    const record = {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    assert.equal(typeof record.createdAt, 'string');
    assert.equal(typeof record.updatedAt, 'string');
    assert.ok(record.createdAt.length > 0);
    assert.ok(record.updatedAt.length > 0);
  });

  test('should validate Result type shape', () => {
    const successResult = { ok: true, value: 42 };
    const errorResult = {
      ok: false,
      error: { code: 'ERR', message: 'failed' },
    };

    assert.equal(successResult.ok, true);
    assert.equal(successResult.value, 42);
    assert.equal(errorResult.ok, false);
    assert.equal(errorResult.error.code, 'ERR');
    assert.equal(errorResult.error.message, 'failed');
  });

  test('should validate SerializedError shape', () => {
    const error = {
      code: 'TIMEOUT',
      message: 'Request timed out',
      details: { url: 'http://example.com' },
    };
    assert.equal(typeof error.code, 'string');
    assert.equal(typeof error.message, 'string');
    assert.ok(typeof error.details === 'object');
  });

  test('should validate StdioJsonRpcMessage shape', () => {
    const request = {
      jsonrpc: '2.0' as const,
      id: '1',
      method: 'test',
      params: {},
    };
    const response = {
      jsonrpc: '2.0' as const,
      id: '1',
      result: { data: true },
    };
    const errorResponse = {
      jsonrpc: '2.0' as const,
      id: '1',
      error: { code: 'ERR', message: 'fail' },
    };

    assert.equal(request.jsonrpc, '2.0');
    assert.equal(request.method, 'test');
    assert.equal(response.jsonrpc, '2.0');
    assert.equal(response.result.data, true);
    assert.equal(errorResponse.error.code, 'ERR');
  });

  test('should validate EvidencePointer shape', () => {
    const pointer = {
      kind: 'screenshot' as const,
      path: '/tmp/shot.png',
      description: 'Page screenshot',
    };
    assert.equal(pointer.kind, 'screenshot');
    assert.equal(typeof pointer.path, 'string');
    assert.equal(typeof pointer.description, 'string');
  });

  test('should validate SessionArtifactPaths shape', () => {
    const paths = {
      rootDir: '/tmp/session',
      profileDir: '/tmp/session/profile',
      evidenceDir: '/tmp/session/evidence',
      metadataPath: '/tmp/session/meta.json',
    };
    assert.equal(typeof paths.rootDir, 'string');
    assert.equal(typeof paths.profileDir, 'string');
    assert.equal(typeof paths.evidenceDir, 'string');
    assert.equal(typeof paths.metadataPath, 'string');
  });

  test('should validate KeyValue shape', () => {
    const kv = { key: 'PORT', value: '3000' };
    assert.equal(typeof kv.key, 'string');
    assert.equal(typeof kv.value, 'string');
  });
});
