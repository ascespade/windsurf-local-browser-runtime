import { randomUUID } from 'node:crypto';
import { mkdir, access, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';

export interface ChromeLaunchResult {
  process: ChildProcess;
  executablePath: string;
  debugPort: number;
  profileDir: string;
}

const candidateExecutables = process.platform === 'win32'
  ? [
      process.env['PROGRAMFILES'] ? join(process.env['PROGRAMFILES'], 'Google/Chrome/Application/chrome.exe') : '',
      process.env['PROGRAMFILES(X86)'] ? join(process.env['PROGRAMFILES(X86)'], 'Google/Chrome/Application/chrome.exe') : '',
      process.env['PROGRAMFILES'] ? join(process.env['PROGRAMFILES'], 'Microsoft/Edge/Application/msedge.exe') : '',
    ]
  : process.platform === 'darwin'
    ? [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      ]
    : [
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/usr/bin/microsoft-edge',
      ];

export async function resolveChromeExecutable(): Promise<string> {
  for (const candidate of candidateExecutables) {
    if (!candidate) continue;
    try {
      await access(candidate);
      return candidate;
    } catch {
      // continue
    }
  }

  throw new Error('Chrome/Chromium executable not found in standard locations.');
}

export function chooseDebugPort(preferred?: number): number {
  if (preferred && preferred > 1024 && preferred < 65535) {
    return preferred;
  }
  return 9222 + Math.floor(Math.random() * 1000);
}

export async function ensureProfileDir(sessionName: string): Promise<string> {
  const dir = resolve(tmpdir(), 'wlbr-browser-profiles', sessionName, randomUUID());
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function launchChromeVisible(sessionName: string, preferredPort?: number): Promise<ChromeLaunchResult> {
  const executablePath = await resolveChromeExecutable();
  const debugPort = chooseDebugPort(preferredPort);
  const profileDir = await ensureProfileDir(sessionName);
  const firstRunMarker = join(profileDir, 'First Run');
  await writeFile(firstRunMarker, '', 'utf8');

  const args = [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--new-window',
    'about:blank',
  ];

  const child = spawn(executablePath, args, {
    detached: false,
    stdio: 'ignore',
  });

  return {
    process: child,
    executablePath,
    debugPort,
    profileDir,
  };
}
