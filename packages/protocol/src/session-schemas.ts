import type {
  EvidencePointer,
  OrchestrationState,
  ProjectState,
  RuntimeEnvironment,
  SessionArtifactPaths,
  SessionState,
  TimestampedRecord,
} from '@wlbr/shared-types';

export interface BrowserSessionRecord extends TimestampedRecord {
  id: string;
  name: string;
  state: SessionState;
  runtimeEnvironment: RuntimeEnvironment;
  profilePath: string;
  browserProcessId: number | undefined;
  debugPort: number | undefined;
  browserWsUrl: string | undefined;
  activeTargetId: string | undefined;
  lastKnownUrl: string | undefined;
  paths: SessionArtifactPaths | undefined;
  tags: string[] | undefined;
}

export interface RemoteProjectRecord extends TimestampedRecord {
  id: string;
  cwd: string;
  state: ProjectState;
  framework: 'nextjs' | 'vite' | 'laravel' | 'node' | 'unknown';
  packageManager: 'pnpm' | 'npm' | 'yarn' | 'bun' | 'unknown';
  startCommand: string;
  installCommand: string;
  buildCommand: string | undefined;
  testCommand: string | undefined;
  port: number | undefined;
  pid: number | undefined;
  url: string | undefined;
}

export interface OrchestrationRunRecord extends TimestampedRecord {
  id: string;
  taskId: string;
  state: OrchestrationState;
  summary: string;
  sessionId?: string;
  remoteProjectId?: string;
  pointers: EvidencePointer[];
}
