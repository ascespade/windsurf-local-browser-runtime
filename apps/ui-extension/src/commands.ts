export interface ExtensionCommand {
  id: string;
  title: string;
  description: string;
}

export const commands: ExtensionCommand[] = [
  {
    id: 'wlbr.browser.launchVisible',
    title: 'Launch Visible Browser Session',
    description:
      'Starts a local visible browser session backed by the browser runtime.',
  },
  {
    id: 'wlbr.remote.startProject',
    title: 'Start Remote Project Runtime',
    description:
      'Starts the selected remote project and resolves a forwarded local URL.',
  },
  {
    id: 'wlbr.orchestrator.launchAndProbe',
    title: 'Launch And Probe Workspace',
    description:
      'Starts the remote runtime and opens a visible browser against the current workspace URL.',
  },
];
