import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import * as vscode from 'vscode';
import { commands, findCommandSpec, type ExtensionCommand } from './commands.js';

export { commands };
export type { ExtensionCommand } from './commands.js';

function currentWorkspacePath(): string {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
}

function createOutputChannel(): vscode.OutputChannel {
  return vscode.window.createOutputChannel('WLBR');
}

function buildDetachedArgs(command: ExtensionCommand, workspacePath: string): string[] {
  const extraArgs = command.id === 'wlbr.orchestrator.launchAndProbe' ? [workspacePath] : [];
  return [
    '--experimental-strip-types',
    resolve(workspacePath, command.entrypoint),
    ...extraArgs,
  ];
}

function runDetached(command: ExtensionCommand, output: vscode.OutputChannel): void {
  const workspacePath = currentWorkspacePath();
  const args = buildDetachedArgs(command, workspacePath);
  output.appendLine(`[WLBR] launching ${command.id}`);
  output.appendLine(`[WLBR] cwd=${workspacePath}`);
  output.appendLine(`[WLBR] args=${JSON.stringify(args)}`);
  const child = spawn(process.execPath, args, {
    cwd: workspacePath,
    stdio: 'ignore',
    detached: true,
  });
  child.unref();
}

export function activate(context: vscode.ExtensionContext): void {
  const output = createOutputChannel();
  context.subscriptions.push(output);

  for (const command of commands) {
    context.subscriptions.push(
      vscode.commands.registerCommand(command.id, () => {
        runDetached(command, output);
        void vscode.window.showInformationMessage(command.successMessage);
      }),
    );
  }
}

export function deactivate(): void {
  // no-op
}

export { buildDetachedArgs, findCommandSpec };
