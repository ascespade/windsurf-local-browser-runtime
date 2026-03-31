export interface BrowserTarget {
  id: string;
  title: string;
  url: string | undefined;
  type: string | undefined;
}

function normalizeUrl(url: string | undefined): string | undefined {
  return typeof url === 'string' && url.trim().length > 0 ? url : undefined;
}

export function resolveTargetByUrl(
  targets: BrowserTarget[],
  url: string,
): BrowserTarget | undefined {
  return targets.find((target) => normalizeUrl(target.url) === url);
}

export function resolveBestTarget(
  targets: BrowserTarget[],
  preferredUrl?: string,
): BrowserTarget | undefined {
  const sanitizedTargets = targets.filter((target) => normalizeUrl(target.url));

  if (preferredUrl) {
    const exact = resolveTargetByUrl(sanitizedTargets, preferredUrl);
    if (exact) {
      return exact;
    }
  }

  return (
    sanitizedTargets.find(
      (target) => target.type === 'page' && (target.url ?? '').startsWith('http'),
    ) ??
    sanitizedTargets.find((target) => target.type === 'page') ??
    sanitizedTargets[0]
  );
}
