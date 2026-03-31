import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import type {
  RemoteHealthCheckInput,
  RemoteProjectInspectInput,
  RemoteProjectRecord,
  RemoteProjectStartInput,
} from '@wlbr/protocol';
import { buildLocalUrl, normalizeForwardedUrl } from '@wlbr/url-bridge';
import { detectProject } from './project.js';

function nowIso(): string {
  return new Date().toISOString();
}

interface RuntimeState {
  projects: RemoteProjectRecord[];
}

export class RemoteRuntime {
  private readonly statePath: string;
  private readonly processes = new Map<string, ChildProcess>();
  private state: RuntimeState = { projects: [] };

  constructor(private readonly rootDir: string) {
    this.statePath = resolve(rootDir, 'remote-projects.json');
  }

  async init(): Promise<void> {
    await mkdir(this.rootDir, { recursive: true });
    try {
      const raw = await readFile(this.statePath, 'utf8');
      this.state = JSON.parse(raw) as RuntimeState;
    } catch {
      await this.flush();
    }
  }

  async inspect(input: RemoteProjectInspectInput): Promise<RemoteProjectRecord> {
    const detected = await detectProject(input.cwd);
    const timestamp = nowIso();
    return {
      id: `inspect_${Date.now()}`,
      cwd: input.cwd,
      state: 'idle',
      framework: detected.framework,
      packageManager: detected.packageManager,
      installCommand: detected.installCommand,
      startCommand: detected.startCommand,
      buildCommand: detected.buildCommand,
      testCommand: detected.testCommand,
      port: undefined,
      pid: undefined,
      url: undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  async start(input: RemoteProjectStartInput): Promise<RemoteProjectRecord> {
    const plan = await detectProject(input.cwd);
    const timestamp = nowIso();
    const id = randomUUID();
    const port = input.preferredPort ?? (plan.framework === 'nextjs' ? 3000 : plan.framework === 'vite' ? 5173 : 3001);
    const env = {
      ...process.env,
      PORT: String(port),
      HOST: '0.0.0.0',
    };

    const child = spawn(plan.startCommand, {
      cwd: input.cwd,
      env,
      shell: true,
      detached: false,
      stdio: 'ignore',
    });

    this.processes.set(id, child);

    const record: RemoteProjectRecord = {
      id,
      cwd: input.cwd,
      state: 'starting',
      framework: plan.framework,
      packageManager: plan.packageManager,
      installCommand: plan.installCommand,
      startCommand: plan.startCommand,
      buildCommand: plan.buildCommand,
      testCommand: plan.testCommand,
      port,
      pid: child.pid,
      url: normalizeForwardedUrl(buildLocalUrl(port)),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.state.projects.push(record);
    await this.flush();

    return {
      ...record,
      state: 'running',
      updatedAt: nowIso(),
    };
  }

  list(): RemoteProjectRecord[] {
    return [...this.state.projects];
  }

  async stop(projectId: string): Promise<{ ok: true }> {
    const child = this.processes.get(projectId);
    if (child?.pid) {
      try {
        process.kill(child.pid);
      } catch {
        // already exited
      }
    }
    this.processes.delete(projectId);
    this.state.projects = this.state.projects.map((project) =>
      project.id === projectId ? { ...project, state: 'stopped', updatedAt: nowIso() } : project,
    );
    await this.flush();
    return { ok: true };
  }

  async health(input: RemoteHealthCheckInput): Promise<{ ok: boolean; status?: number; bodyPreview?: string }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? 5000);
    try {
      const response = await fetch(input.url, { signal: controller.signal });
      const body = await response.text();
      return {
        ok: response.ok,
        status: response.status,
        bodyPreview: body.slice(0, 300),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private async flush(): Promise<void> {
    await writeFile(this.statePath, JSON.stringify(this.state, null, 2), 'utf8');
  }
}
