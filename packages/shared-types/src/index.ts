export type RuntimeEnvironment = 'local' | 'remote';

export type SessionState =
  | 'created'
  | 'launching'
  | 'connected'
  | 'ready'
  | 'busy'
  | 'paused'
  | 'error'
  | 'closed';

export type ProjectState =
  | 'idle'
  | 'detecting'
  | 'installing'
  | 'starting'
  | 'running'
  | 'unhealthy'
  | 'restarting'
  | 'stopped'
  | 'failed';

export type OrchestrationState =
  | 'planned'
  | 'executing'
  | 'awaiting_observation'
  | 'patching'
  | 'retesting'
  | 'verified'
  | 'failed';

export type EvidenceKind = 'screenshot' | 'dom' | 'console' | 'network' | 'log' | 'report';

export interface TimestampedRecord {
  createdAt: string;
  updatedAt: string;
}

export interface EvidencePointer {
  kind: EvidenceKind;
  path: string;
  description: string;
}

export interface Result<T> {
  ok: boolean;
  value?: T;
  error?: SerializedError;
}

export interface SerializedError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface KeyValue {
  key: string;
  value: string;
}

export interface StdioJsonRpcMessage {
  jsonrpc: '2.0';
  id?: string | number | undefined;
  method?: string | undefined;
  params?: Record<string, unknown> | undefined;
  result?: unknown | undefined;
  error?: SerializedError | undefined;
}

export interface SessionArtifactPaths {
  rootDir: string;
  profileDir: string;
  evidenceDir: string;
  metadataPath: string;
}
