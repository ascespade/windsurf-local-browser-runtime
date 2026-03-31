/* eslint-disable no-unused-vars */

declare module 'vscode' {
  export interface Disposable {
    dispose(): unknown;
  }

  export interface ExtensionContext {
    subscriptions: Disposable[];
  }

  export const commands: {
    registerCommand(
      _command: string,
      _callback: (..._args: unknown[]) => unknown,
    ): Disposable;
  };

  export const window: {
    showInformationMessage(_message: string): Thenable<void>;
    showErrorMessage(_message: string): Thenable<void>;
  };

  export const workspace: {
    workspaceFolders?: Array<{ uri: { fsPath: string } }>;
  };
}
