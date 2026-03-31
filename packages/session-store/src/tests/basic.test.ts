import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import type { BrowserSessionRecord } from '@wlbr/protocol';
import { InMemorySessionStore } from '../index.js';

function makeSession(
  overrides: Partial<BrowserSessionRecord> = {},
): BrowserSessionRecord {
  return {
    id: randomUUID(),
    name: 'test-session',
    state: 'ready',
    runtimeEnvironment: 'local',
    profilePath: '/tmp/profile',
    browserProcessId: undefined,
    debugPort: undefined,
    browserWsUrl: undefined,
    activeTargetId: undefined,
    lastKnownUrl: undefined,
    paths: undefined,
    tags: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('InMemorySessionStore', () => {
  test('should start empty', () => {
    const store = new InMemorySessionStore();
    assert.deepEqual(store.list(), []);
  });

  test('should insert a new record via upsert', async () => {
    const store = new InMemorySessionStore();
    const session = makeSession({ id: 's1' });
    const saved = await store.upsert(session);

    assert.equal(saved.id, 's1');
    assert.ok(saved.createdAt.length > 0);
    assert.ok(saved.updatedAt.length > 0);
  });

  test('should retrieve a record by id via get', async () => {
    const store = new InMemorySessionStore();
    const session = makeSession({ id: 's2' });
    await store.upsert(session);

    const found = store.get('s2');
    assert.ok(found);
    assert.equal(found!.id, 's2');
  });

  test('should return undefined for non-existent id via get', () => {
    const store = new InMemorySessionStore();
    assert.equal(store.get('nonexistent'), undefined);
  });

  test('should update an existing record via upsert', async () => {
    const store = new InMemorySessionStore();
    const original = makeSession({ id: 's3', state: 'ready' });
    await store.upsert(original);

    const updated = await store.upsert({ ...original, state: 'busy' });
    assert.equal(updated.state, 'busy');
    assert.equal(updated.id, 's3');
    assert.equal(store.get('s3')!.state, 'busy');
  });

  test('should preserve createdAt on upsert update', async () => {
    const store = new InMemorySessionStore();
    const original = makeSession({ id: 's4' });
    const saved = await store.upsert(original);

    await new Promise((resolve) => setTimeout(resolve, 10));
    const updated = await store.upsert({ ...saved, state: 'closed' });

    assert.equal(updated.createdAt, saved.createdAt);
    assert.notEqual(updated.updatedAt, saved.updatedAt);
  });

  test('should delete an existing record', async () => {
    const store = new InMemorySessionStore();
    await store.upsert(makeSession({ id: 's5' }));
    const deleted = await store.delete('s5');

    assert.equal(deleted, true);
    assert.equal(store.get('s5'), undefined);
  });

  test('should return false when deleting non-existent record', async () => {
    const store = new InMemorySessionStore();
    const deleted = await store.delete('nonexistent');
    assert.equal(deleted, false);
  });

  test('should list records sorted by createdAt', async () => {
    const store = new InMemorySessionStore();
    await store.upsert(
      makeSession({ id: 'b', createdAt: '2026-01-02T00:00:00Z' }),
    );
    await store.upsert(
      makeSession({ id: 'a', createdAt: '2026-01-01T00:00:00Z' }),
    );
    await store.upsert(
      makeSession({ id: 'c', createdAt: '2026-01-03T00:00:00Z' }),
    );

    const list = store.list();
    assert.equal(list.length, 3);
    assert.equal(list[0]!.id, 'a');
    assert.equal(list[1]!.id, 'b');
    assert.equal(list[2]!.id, 'c');
  });

  test('should load replaces all existing data', async () => {
    const store = new InMemorySessionStore();
    await store.upsert(makeSession({ id: 'old' }));

    store.load([makeSession({ id: 'new1' }), makeSession({ id: 'new2' })]);

    assert.equal(store.get('old'), undefined);
    assert.ok(store.get('new1'));
    assert.ok(store.get('new2'));
    assert.equal(store.list().length, 2);
  });

  test('should patch an existing record', async () => {
    const store = new InMemorySessionStore();
    await store.upsert(makeSession({ id: 's6', state: 'ready' }));

    const patched = await store.patch('s6', { state: 'busy' });
    assert.ok(patched);
    assert.equal(patched!.state, 'busy');
    assert.equal(patched!.id, 's6');
  });

  test('should return undefined when patching non-existent record', async () => {
    const store = new InMemorySessionStore();
    const patched = await store.patch('nonexistent', { state: 'busy' });
    assert.equal(patched, undefined);
  });

  test('should preserve other fields when patching', async () => {
    const store = new InMemorySessionStore();
    await store.upsert(
      makeSession({ id: 's7', state: 'ready', name: 'original-name' }),
    );

    const patched = await store.patch('s7', { state: 'busy' });
    assert.equal(patched!.state, 'busy');
    assert.equal(patched!.name, 'original-name');
  });

  test('should update updatedAt on patch', async () => {
    const store = new InMemorySessionStore();
    const saved = await store.upsert(makeSession({ id: 's8' }));

    await new Promise((resolve) => setTimeout(resolve, 10));
    const patched = await store.patch('s8', { state: 'busy' });

    assert.notEqual(patched!.updatedAt, saved.updatedAt);
  });

  test('should return independent copies from list', async () => {
    const store = new InMemorySessionStore();
    await store.upsert(makeSession({ id: 's9' }));

    const list1 = store.list();
    const list2 = store.list();
    assert.notStrictEqual(list1, list2);
    assert.equal(list1.length, list2.length);
  });
});
