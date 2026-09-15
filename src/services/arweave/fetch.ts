import { assetUrl, demoteGateway, isGatewayUrl } from './gateways';
import { MAX_RETRIES, RETRY_DELAY_MS } from './policy';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * `fetch` with the gateway policy, for the paths that genuinely do fetch bytes —
 * the song and image downloads. Media *elements* don't come through here; they
 * fail over by reassigning their own `src` (see `./media`, `./image`),
 * because routing them through `fetch()` + blob urls would cost audio its
 * range-based streaming and images the service worker's cache.
 *
 * Sweeps the gateways before spending a retry, so a host that has lost this
 * content costs one request rather than the whole budget. A 4xx moves us on
 * rather than asking the same host twice. Throws the last failure once spent.
 */
export async function fetchArweave(url: string, init?: RequestInit): Promise<Response> {
  let lastError: unknown = new Error(`Could not fetch ${url}`);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await delay(RETRY_DELAY_MS);

    // Each pass walks the gateways until one answers or they're all spent.
    for (;;) {
      const target = assetUrl(url);
      try {
        const res = await fetch(target, init);
        if (res.ok) return res;
        // Nowhere else to send a url we don't route — hand back what came.
        if (!isGatewayUrl(url)) return res;
        lastError = new Error(`Gateway answered ${res.status} for ${target}`);
      } catch (err) {
        // A caller aborting is a decision, not a failure — don't retry over it.
        if ((err as DOMException)?.name === 'AbortError') throw err;
        if (!isGatewayUrl(url)) throw err;
        lastError = err;
      }
      if (!(await demoteGateway(target))) break;
    }
  }

  throw lastError;
}
