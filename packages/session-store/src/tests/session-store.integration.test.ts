import { test, describe, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { writeFile, rm, readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

// Test the actual FileBackedSessionStore by importing its implementation
describe('FileBackedSessionStore Integration Tests', () => {
  const testDir = '/tmp/test-session-store';

  before(async () => {
    await rm(testDir, { recursive: true, force: true });
    await mkdir(testDir, { recursive: true });
  });

  after(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('should initialize empty store', async () => {
    // Import the class implementation directly
    const { FileBackedSessionStore } = await import('../index.js');
    const metadataPath = join(testDir, 'empty-test.json');
    
    const store = new FileBackedSessionStore(metadataPath);
    await store.init();
    
    const sessions = store.list();
    assert.deepEqual(sessions, []);
  });

  test('should store and retrieve session', async () => {
    const { FileBackedSessionStore } = await import('../index.js');
    const metadataPath = join(testDir, 'store-test.json');
    
    const store = new FileBackedSessionStore(metadataPath);
    await store.init();
    
    const session = {
      id: randomUUID(),
      name: 'test-session',
      state: 'ready' as const,
      runtimeEnvironment: 'local' as const,
      profilePath: '/tmp/profile',
      browserProcessId: 1234,
      debugPort: 9222,
      browserWsUrl: 'ws://localhost:9222',
      activeTargetId: 'target-1',
      lastKnownUrl: 'https://example.com',
      paths: {
        rootDir: '/tmp/session',
        profileDir: '/tmp/profile',
        evidenceDir: '/tmp/evidence',
        metadataPath: '/tmp/metadata',
      },
      tags: ['test'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await store.upsert(session);
    
    const retrieved = store.get(session.id);
    assert.deepEqual(retrieved, session);
  });

  test('should update existing session', async () => {
    const { FileBackedSessionStore } = await import('../index.js');
    const metadataPath = join(testDir, 'update-test.json');
    
    const store = new FileBackedSessionStore(metadataPath);
    await store.init();
    
    const session = {
      id: randomUUID(),
      name: 'test-session',
      state: 'ready' as const,
      runtimeEnvironment: 'local' as const,
      profilePath: '/tmp/profile',
      browserProcessId: undefined,
      debugPort: undefined,
      browserWsUrl: undefined,
      activeTargetId: undefined,
      lastKnownUrl: undefined,
      paths: {
        rootDir: '/tmp/session',
        profileDir: '/tmp/profile',
        evidenceDir: '/tmp/evidence',
        metadataPath: '/tmp/metadata',
      },
      tags: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await store.upsert(session);
    await store.patch(session.id, { state: 'connected' as const, debugPort: 9222 });
    
    const updated = store.get(session.id);
    assert.equal(updated?.state, 'connected');
    assert.equal(updated?.debugPort, 9222);
  });

  test('should persist sessions across instances', async () => {
    const { FileBackedSessionStore } = await import('../index.js');
    const metadataPath = join(testDir, 'persist-test.json');
    
    const store1 = new FileBackedSessionStore(metadataPath);
    await store1.init();
    
    const session = {
      id: randomUUID(),
      name: 'persistent-session',
      state: 'ready' as const,
      runtimeEnvironment: 'local' as const,
      profilePath: '/tmp/profile',
      browserProcessId: undefined,
      debugPort: undefined,
      browserWsUrl: undefined,
      activeTargetId: undefined,
      lastKnownUrl: undefined,
      paths: {
        rootDir: '/tmp/session',
        profileDir: '/tmp/profile',
        evidenceDir: '/tmp/evidence',
        metadataPath: '/tmp/metadata',
      },
      tags: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await store1.upsert(session);
    
    const store2 = new FileBackedSessionStore(metadataPath);
    await store2.init();
    
    const retrieved = store2.get(session.id);
    assert.deepEqual(retrieved, session);
  });

  test('should handle file persistence correctly', async () => {
    const { FileBackedSessionStore } = await import('../index.js');
    const metadataPath = join(testDir, 'file-test.json');
    
    const store = new FileBackedSessionStore(metadataPath);
    await store.init();
    
    const session = {
      id: randomUUID(),
      name: 'persistence-test',
      state: 'ready' as const,
      runtimeEnvironment: 'local' as const,
      profilePath: '/tmp/profile',
      browserProcessId: undefined,
      debugPort: undefined,
      browserWsUrl: undefined,
      activeTargetId: undefined,
      lastKnownUrl: undefined,
      paths: {
        rootDir: '/tmp/session',
        profileDir: '/tmp/profile',
        evidenceDir: '/tmp/evidence',
        metadataPath: '/tmp/metadata',
      },
      tags: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await store.upsert(session);
    
    // Verify file exists and contains data
    const fileContent = await readFile(metadataPath, 'utf8');
    const parsedData = JSON.parse(fileContent);
    
    assert.ok(parsedData.sessions);
    assert.ok(Array.isArray(parsedData.sessions));
    assert.ok(parsedData.sessions.length > 0);
    assert.equal(parsedData.sessions[0].id, session.id);
  });
});
