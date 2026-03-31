import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import * as vscode from 'vscode';

export interface ExtensionCommand {
  id: string;
  title: string;
  description: string;
}

export const commands: ExtensionCommand[] = [
  {
    id: 'wlbr.browser.launchVisible',
    title: 'Launch Visible Browser Session',
    description: 'Starts a local visible browser session backed by the browser runtime.',
  },
  {
    id: 'wlbr.remote.startProject',
    title: 'Start Remote Project Runtime',
    description: 'Starts the selected remote project and resolves a forwarded local URL.',
  },
  {
    id: 'wlbr.orchestrator.launchAndProbe',
    title: 'Launch And Probe Workspace',
    description: 'Starts the remote runtime and opens a visible browser against the current workspace URL.',
  },
];

function currentWorkspacePath(): string {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
}

function runDetached(args: string[]): void {
  const child = spawn(process.execPath, args, {
    cwd: currentWorkspacePath(),
    stdio: 'ignore',
    detached: true,
  });
  child.unref();
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('wlbr.browser.launchVisible', () => {
      runDetached(['--experimental-strip-types', resolve(currentWorkspacePath(), 'apps/browser-mcp/src/index.ts')]);
      void vscode.window.showInformationMessage('WLBR browser runtime launched.');
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('wlbr.remote.startProject', () => {
      runDetached(['--experimental-strip-types', resolve(currentWorkspacePath(), 'apps/remote-runtime/src/index.ts')]);
      void vscode.window.showInformationMessage('WLBR remote runtime launched.');
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('wlbr.orchestrator.launchAndProbe', () => {
      runDetached([
        '--experimental-strip-types',
        resolve(currentWorkspacePath(), 'apps/orchestrator/src/index.ts'),
        currentWorkspacePath(),
      ]);
      void vscode.window.showInformationMessage('WLBR launch-and-probe flow started.');
    }),
  );
}

export function deactivate(): void {
  // no-op
}
