import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { BrowserSessionRecord } from '@wlbr/protocol';

interface SessionStoreShape {
  sessions: BrowserSessionRecord[];
}

function nowIso(): string {
  return new Date().toISOString();
}

export class InMemorySessionStore {
  private readonly sessions = new Map<string, BrowserSessionRecord>();

  async upsert(record: BrowserSessionRecord): Promise<BrowserSessionRecord> {
    const existing = this.sessions.get(record.id);
    const merged: BrowserSessionRecord = {
      ...existing,
      ...record,
      createdAt: existing?.createdAt ?? record.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };
    this.sessions.set(record.id, merged);
    return merged;
  }

  async patch(
    sessionId: string,
    patch: Partial<BrowserSessionRecord>,
  ): Promise<BrowserSessionRecord | undefined> {
    const existing = this.sessions.get(sessionId);
    if (!existing) {
      return undefined;
    }

    const merged: BrowserSessionRecord = {
      ...existing,
      ...patch,
      updatedAt: nowIso(),
    };
    this.sessions.set(sessionId, merged);
    return merged;
  }

  get(sessionId: string): BrowserSessionRecord | undefined {
    return this.sessions.get(sessionId);
  }

  async delete(sessionId: string): Promise<boolean> {
    return this.sessions.delete(sessionId);
  }

  list(): BrowserSessionRecord[] {
    return [...this.sessions.values()].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
  }

  load(records: BrowserSessionRecord[]): void {
    this.sessions.clear();
    for (const record of records) {
      this.sessions.set(record.id, record);
    }
  }
}

export class FileBackedSessionStore extends InMemorySessionStore {
  constructor(private readonly metadataPath: string) {
    super();
  }

  async init(): Promise<void> {
    await mkdir(dirname(this.metadataPath), { recursive: true });
    try {
      const raw = await readFile(this.metadataPath, 'utf8');
      const parsed = JSON.parse(raw) as SessionStoreShape | BrowserSessionRecord[];
      // Handle both formats: {sessions: [...]} or direct array [...]
      const sessions = Array.isArray(parsed) ? parsed : (parsed.sessions ?? []);
      // Convert null back to undefined for consistency
      const normalizedSessions = sessions.map(session => {
        const normalized: Record<string, unknown> = { ...session };
        Object.keys(normalized).forEach(key => {
          if (normalized[key] === null) {
            normalized[key] = undefined;
          }
        });
        return normalized;
      });
      this.load(normalizedSessions);
    } catch {
      // File doesn't exist or is empty, create empty file
      await this.flush();
    }
  }

  override async upsert(record: BrowserSessionRecord): Promise<BrowserSessionRecord> {
    const saved = super.upsert(record);
    await this.flush();
    return saved;
  }

  override async patch(
    sessionId: string,
    patch: Partial<BrowserSessionRecord>,
  ): Promise<BrowserSessionRecord | undefined> {
    const saved = await super.patch(sessionId, patch);
    if (saved !== undefined) {
      await this.flush();
    }
    return saved;
  }

  override async delete(sessionId: string): Promise<boolean> {
    const removed = await super.delete(sessionId);
    if (removed) {
      await this.flush();
    }
    return removed;
  }

  async flush(): Promise<void> {
    const sessions = this.list();
    // Use a custom replacer to preserve undefined values as null
    const payload: SessionStoreShape = {
      sessions: sessions.map(session => {
        const serialized: Record<string, unknown> = { ...session };
        // Convert undefined to null for JSON serialization
        Object.keys(serialized).forEach(key => {
          if (serialized[key] === undefined) {
            serialized[key] = null;
          }
        });
        return serialized;
      }),
    };
    await mkdir(dirname(resolve(this.metadataPath)), { recursive: true });
    await writeFile(
      this.metadataPath,
      JSON.stringify(payload, null, 2),
      'utf8',
    );
  }
}
