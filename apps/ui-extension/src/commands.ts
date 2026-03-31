export interface ExtensionCommand {
  id: string;
  title: string;
  description: string;
  entrypoint: string;
  args?: string[];
  successMessage: string;
}

export const commands: ExtensionCommand[] = [
  {
    id: 'wlbr.browser.launchVisible',
    title: 'Launch Visible Browser Session',
    description:
      'Starts a local visible browser session backed by the browser runtime.',
    entrypoint: 'apps/browser-mcp/src/index.ts',
    successMessage: 'WLBR browser runtime launched.',
  },
  {
    id: 'wlbr.remote.startProject',
    title: 'Start Remote Project Runtime',
    description:
      'Starts the selected remote project and resolves a forwarded local URL.',
    entrypoint: 'apps/remote-runtime/src/index.ts',
    successMessage: 'WLBR remote runtime launched.',
  },
  {
    id: 'wlbr.orchestrator.launchAndProbe',
    title: 'Launch And Probe Workspace',
    description:
      'Starts the remote runtime and opens a visible browser against the current workspace URL.',
    entrypoint: 'apps/orchestrator/src/index.ts',
    successMessage: 'WLBR launch-and-probe flow started.',
  },
];

export function findCommandSpec(commandId: string): ExtensionCommand | undefined {
  return commands.find((command) => command.id === commandId);
}
