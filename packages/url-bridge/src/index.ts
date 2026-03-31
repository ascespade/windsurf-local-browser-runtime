export function normalizeForwardedUrl(url: string): string {
  return url.replace('0.0.0.0', '127.0.0.1').replace('localhost', '127.0.0.1');
}

export function buildLocalUrl(port: number, protocol: 'http' | 'https' = 'http', host = '127.0.0.1'): string {
  return `${protocol}://${host}:${port}`;
}

export function extractPort(url: string): number | undefined {
  try {
    const parsed = new URL(url);
    return parsed.port ? Number(parsed.port) : undefined;
  } catch {
    return undefined;
  }
}
