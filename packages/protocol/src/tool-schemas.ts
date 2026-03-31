export interface BrowserLaunchInput {
  sessionName: string;
  headless?: boolean;
  profileStrategy: 'isolated';
  baseUrl?: string;
  preferredBrowser?: 'chrome' | 'chromium' | 'edge';
  debugPort?: number;
}

export interface BrowserActionTarget {
  strategy: 'testId' | 'role' | 'label' | 'css' | 'text';
  value: string;
  role?: string;
  testIdAttribute?: string;
}

export interface BrowserClickInput {
  sessionId: string;
  target: BrowserActionTarget;
  timeoutMs?: number;
}

export interface BrowserTypeInput {
  sessionId: string;
  target: BrowserActionTarget;
  value: string;
  clearFirst?: boolean;
  timeoutMs?: number;
}

export interface BrowserOpenInput {
  sessionId: string;
  url: string;
  waitUntil?: 'domcontentloaded' | 'load' | 'networkIdle';
  timeoutMs?: number;
}

export interface BrowserWaitForInput {
  sessionId: string;
  target: BrowserActionTarget;
  timeoutMs?: number;
}

export interface BrowserSnapshotInput {
  sessionId: string;
  format: 'dom' | 'screenshot';
}

export interface BrowserEvalInput {
  sessionId: string;
  expression: string;
  awaitPromise?: boolean;
}

export interface BrowserAttachInput {
  sessionId: string;
  debugPort: number;
}

export interface BrowserCloseSessionInput {
  sessionId: string;
}

export interface RemoteProjectStartInput {
  cwd: string;
  strategy: 'auto';
  preferredPort?: number;
  install?: boolean;
}

export interface RemoteProjectInspectInput {
  cwd: string;
}

export interface RemoteProjectCommandInput {
  projectId: string;
}

export interface RemoteHealthCheckInput {
  url: string;
  timeoutMs?: number;
}

export interface OrchestratorTaskInput {
  cwd: string;
  baseUrl?: string;
  task: 'launch_and_probe' | 'open_and_capture';
  sessionName?: string;
  targetUrl?: string;
}
