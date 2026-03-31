export interface BrowserTarget {
  id: string;
  title: string;
  url: string;
  type: string | undefined;
}

export function resolveTargetByUrl(targets: BrowserTarget[], url: string): BrowserTarget | undefined {
  return targets.find((target) => target.url === url);
}

export function resolveBestTarget(targets: BrowserTarget[], preferredUrl?: string): BrowserTarget | undefined {
  if (preferredUrl) {
    const exact = resolveTargetByUrl(targets, preferredUrl);
    if (exact) {
      return exact;
    }
  }

  return (
    targets.find((target) => target.type === 'page' && target.url.startsWith('http')) ??
    targets.find((target) => target.type === 'page') ??
    targets[0]
  );
}
