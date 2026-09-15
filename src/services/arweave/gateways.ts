/**
 * Which gateway the app is currently using for Arweave media.
 *
 * The id in a stored url is a content address, not a location — any gateway that
 * has indexed it serves the same bytes, so the host is a routing choice made at
 * read time. This module makes that choice once, for the whole app.
 *
 * There is one active gateway per session. It starts at `TRUSTED_GATEWAYS[0]`
 * and only ever moves when something reports that it failed to deliver, at which
 * point *everything* moves with it — audio, images, downloads. That's the whole
 * contract: callers resolve a url with `assetUrl` and report a dud with
 * `demoteGateway`. Nobody else tracks hosts, and success is never reported,
 * because staying put is the default.
 *
 * `./policy` owns the timing that decides when a load counts as a dud; the
 * handlers beside it (`./media`, `./image`, `./fetch`) apply both.
 */

/**
 * Used in preference order; `[0]` is where every session starts.
 * Mirrored by the image-cache host regex in `vite.config.ts` — change both together.
 *
 * Before promoting arweave.net to `[0]`: it ignores `Range` and answers 200 with
 * the whole file where turbo-gateway answers 206. Fine as a fallback, but it
 * costs seek-before-buffer and re-opens the iOS issue `vite.config.ts` documents.
 */
export const TRUSTED_GATEWAYS = ['turbo-gateway.com', 'arweave.net'];

let current = TRUSTED_GATEWAYS[0];
const burned: string[] = [];

/** Peers from `/ar-io/peers`, fetched only once the trusted list is spent. */
let discovered: string[] = [];
let discovery: Promise<string[]> | null = null;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach(fn => fn());

const known = () => [...TRUSTED_GATEWAYS, ...discovered];

/** The gateway in use. Subscribe via `useGateway` to re-render when it moves. */
export const activeGateway = () => current;

export function subscribeToGateway(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Whether a url is one we route, and so worth failing over. Matches the sandbox
 * subdomains gateways redirect to as well as the apex. Deliberately narrow — a
 * 404 from elsewhere is an answer, and `/Images/…` should fail immediately.
 */
export function isGatewayUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url, window.location.href);
    return known().some(host => hostname.endsWith(host));
  } catch {
    return false;
  }
}

/**
 * The url to actually request. The stored host is ignored — the path carries the
 * id, and the active gateway supplies the rest. Non-gateway urls pass through.
 */
export function assetUrl(storedUrl: string): string {
  if (!isGatewayUrl(storedUrl)) return storedUrl;
  try {
    const { pathname, search } = new URL(storedUrl, window.location.href);
    return `https://${current}${pathname}${search}`;
  } catch {
    return storedUrl;
  }
}

/**
 * Report that a url didn't deliver, and move the app off that gateway.
 *
 * Pass the url you actually requested. A report against a gateway we've already
 * left is stale and changes nothing — but still resolves `true`, because there
 * genuinely is a different host to retry on now.
 *
 * Resolves `false` once every gateway is spent, which is the caller's cue to
 * stop retrying and surface the failure.
 */
export async function demoteGateway(usedUrl: string): Promise<boolean> {
  let host: string;
  try {
    host = new URL(usedUrl, window.location.href).hostname;
  } catch {
    return false;
  }
  if (!host.endsWith(current)) return true;

  if (!burned.includes(current)) burned.push(current);

  const next =
    TRUSTED_GATEWAYS.find(g => !burned.includes(g)) ??
    (await discoverPeers()).find(g => !burned.includes(g));

  if (next) {
    current = next;
    emit();
    return true;
  }

  // Everything is spent. Forget the burns and go back to the default, so the
  // next load sweeps again from the top — otherwise one bad minute would leave
  // the whole session with nowhere left to try, even after the outage passed.
  //
  // Deliberately silent: this is bookkeeping for the *next* load, not a new host
  // worth re-pointing to. Emitting here would tell subscribers to retry at the
  // same moment `false` tells the caller to stop, and they'd fight.
  burned.length = 0;
  current = TRUSTED_GATEWAYS[0];
  return false;
}

interface PeersResponse {
  gateways?: Record<string, { url?: string; dataWeight?: number }>;
}

/**
 * Ask the AR.IO network who else is serving. Runs at most once a session, and
 * only after every trusted gateway has failed. The registry is the gateway's API
 * rather than its data plane, so it answers even through a data outage.
 */
async function discoverPeers(): Promise<string[]> {
  if (discovered.length) return discovered;
  if (discovery) return discovery;

  discovery = (async () => {
    for (const host of TRUSTED_GATEWAYS) {
      try {
        const res = await fetch(`https://${host}/ar-io/peers`);
        if (!res.ok) continue;
        const body = (await res.json()) as PeersResponse;

        const peers = Object.values(body.gateways ?? {})
          .sort((a, b) => (b.dataWeight ?? 0) - (a.dataWeight ?? 0))
          .map(peer => {
            try {
              return new URL(peer.url ?? '').hostname;
            } catch {
              return '';
            }
          })
          .filter(name => name && !TRUSTED_GATEWAYS.includes(name));

        // A handful is enough. Peers vary wildly in health minute to minute —
        // measured mid-outage, two well-ranked ones alternated between a fast
        // 206 and a hung redirect — and the first-byte deadline weeds those out
        // more cheaply than pre-checking each one would.
        discovered = [...new Set(peers)].slice(0, 5);
        return discovered;
      } catch {
        // Try the next trusted host for the registry.
      }
    }
    return [];
  })();

  try {
    return await discovery;
  } finally {
    discovery = null;
  }
}
