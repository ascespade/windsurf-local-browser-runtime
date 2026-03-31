export interface RuntimeEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  type: string;
  timestamp: string;
  payload: TPayload;
}

export interface BrowserEventPayload extends Record<string, unknown> {
  sessionId: string;
}

export interface RemoteEventPayload extends Record<string, unknown> {
  projectId: string;
}
