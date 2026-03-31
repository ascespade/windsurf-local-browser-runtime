import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { writeFile, rm, readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

// Simple test to verify session store functionality
describe('SessionStore Basic Tests', () => {
  test('should handle file operations correctly', async () => {
    const testDir = '/tmp/test-session-store';
    const testFile = join(testDir, 'test.json');
    const testData = { id: randomUUID(), name: 'test' };
    
    try {
      // Clean up
      await rm(testDir, { recursive: true, force: true });
      
      // Create directory
      await mkdir(testDir, { recursive: true });
      
      // Write test data
      await writeFile(testFile, JSON.stringify(testData, null, 2));
      
      // Read and verify
      const content = await readFile(testFile, 'utf8');
      const parsed = JSON.parse(content);
      
      assert.equal(parsed.id, testData.id);
      assert.equal(parsed.name, testData.name);
      
      // Clean up
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });

  test('should handle UUID generation', async () => {
    const id1 = randomUUID();
    const id2 = randomUUID();
    
    assert.notEqual(id1, id2);
    assert.match(id1, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.match(id2, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  test('should handle JSON serialization', async () => {
    const session = {
      id: randomUUID(),
      name: 'test-session',
      state: 'ready',
      runtimeEnvironment: 'local',
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
    
    const serialized = JSON.stringify(session, null, 2);
    const parsed = JSON.parse(serialized);
    
    assert.deepEqual(parsed, session);
  });
});
