import { assetUrl, demoteGateway, isGatewayUrl } from './gateways';
import { MAX_RETRIES } from './policy';

/**
 * The same gateway policy, for images.
 *
 * Different mechanics from `media.ts` and that's the whole reason this is
 * separate: an `<img>` has no `progress` event and no readable buffer, so a hung
 * gateway is only ever visible as "still not loaded" — a plain deadline rather
 * than a first-byte one. It also can't be retried by reassigning `src` from
 * here; the renderer has to remount it. So this owns the decisions and the
 * budget, and hands back what to do rather than doing it.
 */
export type ImageOutcome =
  /** The app moved gateways. Whatever subscribes to that will re-point us — do nothing. */
  | 'moved'
  /** Same gateway, try again. */
  | 'retry'
  /** Nothing left to try. */
  | 'give-up';

export interface ImageLoader {
  /** Url for the current attempt, on the app's active gateway. */
  readonly src: string | undefined;
  /** Whether this url is ours to route — which is also what earns it `crossorigin`. */
  readonly routed: boolean;
  /** Point at a new stored url, resetting the budget. */
  reset(storedUrl: string | undefined): void;
  /** Re-resolve against whatever gateway is active now. */
  repoint(): void;
  /** The element errored. */
  failed(): Promise<ImageOutcome>;
  /** Nothing arrived within the deadline. */
  expired(): Promise<ImageOutcome>;
}

export function createImageLoader(storedUrl: string | undefined): ImageLoader {
  let stored = storedUrl;
  let resolved = stored ? assetUrl(stored) : undefined;
  let attempts = 0;

  // Both failure paths are the same decision — move if we can, else spend a
  // retry, else stop. Only the trigger differs.
  const giveUpOrRetry = async (): Promise<ImageOutcome> => {
    if (!resolved || !isGatewayUrl(resolved)) return 'give-up';
    if (await demoteGateway(resolved)) return 'moved';
    if (attempts < MAX_RETRIES) {
      attempts += 1;
      return 'retry';
    }
    return 'give-up';
  };

  return {
    get src() {
      return resolved;
    },
    get routed() {
      return typeof stored === 'string' && isGatewayUrl(stored);
    },
    reset(next) {
      stored = next;
      resolved = next ? assetUrl(next) : undefined;
      attempts = 0;
    },
    repoint() {
      resolved = stored ? assetUrl(stored) : undefined;
    },
    failed: giveUpOrRetry,
    expired: giveUpOrRetry,
  };
}
