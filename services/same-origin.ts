// Compares the browser-set Origin with the public host/protocol seen by the proxy.
// Behind Traefik, Next derives request.nextUrl.origin from HOSTNAME (0.0.0.0), never matching.
export function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const first = (value: string | null) => value?.split(',')[0].trim();
  const host = first(request.headers.get('x-forwarded-host')) || request.headers.get('host');
  const protocol = first(request.headers.get('x-forwarded-proto')) || new URL(request.url).protocol.replace(':', '');
  return Boolean(origin && host && origin === `${protocol}://${host}`);
}
