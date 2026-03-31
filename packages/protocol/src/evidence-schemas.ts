import type { EvidencePointer, TimestampedRecord } from '@wlbr/shared-types';

export interface EvidenceBundle extends TimestampedRecord {
  id: string;
  sessionId?: string;
  summary: string;
  pointers: EvidencePointer[];
  facts: string[];
}

export interface ConsoleEntry {
  type: 'log' | 'warning' | 'error' | 'debug' | 'info';
  text: string;
  timestamp: string;
}

export interface NetworkEntry {
  id: string;
  url: string;
  method: string;
  status?: number;
  failureText?: string;
  timestamp: string;
}
