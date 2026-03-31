import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { EvidenceBundle, EvidencePointer } from '@wlbr/protocol';

function nowIso(): string {
  return new Date().toISOString();
}

export function summarizeEvidence(bundle: EvidenceBundle): string {
  return `${bundle.summary} | facts=${bundle.facts.length} | pointers=${bundle.pointers.length}`;
}

export async function writeEvidencePointer(
  evidenceRoot: string,
  kind: EvidencePointer['kind'],
  name: string,
  content: string,
  description: string,
): Promise<EvidencePointer> {
  const path = join(evidenceRoot, `${name}.${kind === 'screenshot' ? 'png' : 'txt'}`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, kind === 'screenshot' ? 'base64' : 'utf8');
  return { kind, path, description };
}

export function createEvidenceBundle(summary: string, pointers: EvidencePointer[], facts: string[]): EvidenceBundle {
  const timestamp = nowIso();
  return {
    id: `ev_${Date.now()}`,
    summary,
    pointers,
    facts,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
