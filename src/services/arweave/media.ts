import { assetUrl, demoteGateway } from './gateways';
import { FIRST_BYTE_MS, MAX_RETRIES, RETRY_DELAY_MS, STALL_SILENCE_MS } from './policy';

/**
 * Getting bytes into a media element, and surviving the gateway while doing it.
 *
 * Audio and video are the same problem — both are `HTMLMediaElement`, both load
 * through their own `src`, both report the same events — so they share this
 * loader rather than each growing their own. Everything about *how* a file loads
 * lives here: gateway failover, the retry budget, the two-phase watchdog. What
 * owns the element is left owning only what it's for.
 *
 * Attaches its own listeners for the load lifecycle only. Whatever else the
 * element is doing — playback position, queue advance, play/pause mirroring —
 * belongs to the caller's own listeners, which coexist happily.
 */
export interface MediaLoader {
  /**
   * Load a url. Pass `play: true` only from inside the click that asked for it —
   * autoplay policy honours `play()` in the gesture and rejects it outside one.
   */
  load(storedUrl: string, options?: { play?: boolean }): void;
  /** Re-run the current url with a fresh budget — a user pressing play *is* a retry. */
  reload(): void;
  /** Abandon whatever is in flight. Nothing already scheduled may resurrect it. */
  cancel(): void;
  /** Detach listeners and drop timers. */
  dispose(): void;
}

export interface MediaLoaderCallbacks {
  /** Bytes are being waited on. Drives the spinner. */
  onLoadingChange?: (loading: boolean) => void;
  /** Every gateway and every retry is spent — this one isn't coming. */
  onFailed?: (message: string) => void;
}

const LOAD_FAILED = "Couldn't load this — check your connection and try again.";

export function createMediaLoader(
  el: HTMLMediaElement,
  { onLoadingChange, onFailed }: MediaLoaderCallbacks = {},
): MediaLoader {
  let storedUrl = '';
  let shouldPlay = false;
  let attempts = 0;
  let gotBytes = false;
  let retryTimer: number | undefined;
  let watchdog: number | undefined;

  // Bumped by anything that supersedes a load. Demoting a gateway is async, so
  // its continuation checks this before touching the element.
  let generation = 0;

  const setLoading = (loading: boolean) => onLoadingChange?.(loading);

  const clearTimers = () => {
    window.clearTimeout(retryTimer);
    window.clearTimeout(watchdog);
    retryTimer = undefined;
    watchdog = undefined;
  };

  // Armed in two phases. Before any bytes it's a short first-byte deadline that
  // routes elsewhere — a sick gateway takes ~15s to admit it, far too long to
  // make anyone wait. Once bytes are flowing it becomes the long silence timer.
  const armWatchdog = () => {
    window.clearTimeout(watchdog);
    watchdog = window.setTimeout(failOver, gotBytes ? STALL_SILENCE_MS : FIRST_BYTE_MS);
  };

  // A retry sweeps every gateway again from the top, so the budget is spent on
  // rounds rather than on hosts.
  const retryOrFail = () => {
    clearTimers();
    if (attempts >= MAX_RETRIES) {
      setLoading(false);
      onFailed?.(LOAD_FAILED);
      return;
    }
    attempts += 1;
    setLoading(true);
    retryTimer = window.setTimeout(attempt, RETRY_DELAY_MS);
  };

  // This gateway didn't deliver. Move the whole app off it and re-run — routing,
  // not failure, so it doesn't spend the budget. Only once every gateway is gone
  // does this become a real retry.
  const failOver = () => {
    const gen = generation;
    clearTimers();
    setLoading(true);
    demoteGateway(el.currentSrc || el.src || '').then(moved => {
      if (gen !== generation) return; // superseded while we looked
      if (moved) attempt();
      else retryOrFail();
    });
  };

  // Re-assigning `src` is the whole point: that's what re-runs the media load
  // algorithm. play() alone can't — after a failed load the element sits in
  // NETWORK_NO_SOURCE with `error` set, and can only reject again.
  const attempt = () => {
    if (!storedUrl) return;
    clearTimers();
    gotBytes = false;
    setLoading(true);
    // The stored host is ignored; the app's active gateway supplies it.
    el.src = assetUrl(storedUrl);
    // `preload="none"` means the browser won't fetch until someone presses play,
    // so there are no bytes to wait for and a deadline would fire on a healthy file.
    if (shouldPlay || el.preload !== 'none') armWatchdog();
    if (!shouldPlay) return;
    el.play().catch(err => {
      const name = (err as DOMException)?.name;
      if (name === 'AbortError') return; // superseded by a newer load
      // Autoplay policy blocking the *start* says nothing about the gateway —
      // the load carries on, and readiness will clear the spinner. Failing over
      // here would burn a working host for the whole app over a browser rule.
      if (name === 'NotAllowedError') return;
      failOver();
    });
  };

  // Bytes arrived: swap the short deadline for the long one. `progress` is
  // unreliable on Safari, so metadata and a non-empty buffer count the same.
  const noteBytes = () => {
    if (gotBytes) return;
    gotBytes = true;
    armWatchdog();
  };

  const onProgress = () => {
    if (el.buffered.length > 0) noteBytes();
    // Guarded on the timer being armed, so buffering mid-playback doesn't start one.
    if (watchdog !== undefined) armWatchdog();
  };

  // The browser has stopped fetching *on purpose* — buffer full, or `preload`
  // satisfied. Nothing is owed, so stand the watchdog down. Without this a
  // `preload="metadata"` video would look silent after its header and get failed
  // over ~20s later despite being perfectly healthy.
  const onSuspend = () => {
    clearTimers();
    setLoading(false);
  };

  // Starved: it wants bytes it doesn't have. Put the silence timer back up.
  const onWaiting = () => {
    setLoading(true);
    armWatchdog();
  };

  // Reaching a ready state means the load landed: stand the watchdog down and
  // give this file its full budget back for whatever happens next.
  const onReady = () => {
    clearTimers();
    attempts = 0;
    gotBytes = true;
    setLoading(false);
  };

  // Usually this gateway not having the content rather than anything wrong with
  // the file — move on before it ever becomes the user's problem.
  const onError = () => failOver();

  el.addEventListener('progress', onProgress);
  el.addEventListener('loadeddata', noteBytes);
  el.addEventListener('loadedmetadata', noteBytes);
  el.addEventListener('playing', onReady);
  el.addEventListener('canplay', onReady);
  el.addEventListener('suspend', onSuspend);
  el.addEventListener('waiting', onWaiting);
  el.addEventListener('error', onError);

  return {
    load(url, options) {
      generation += 1;
      storedUrl = url;
      shouldPlay = options?.play ?? false;
      attempts = 0;
      attempt();
    },
    reload() {
      generation += 1;
      attempts = 0;
      attempt();
    },
    cancel() {
      generation += 1;
      clearTimers();
    },
    dispose() {
      generation += 1;
      clearTimers();
      el.removeEventListener('progress', onProgress);
      el.removeEventListener('loadeddata', noteBytes);
      el.removeEventListener('loadedmetadata', noteBytes);
      el.removeEventListener('playing', onReady);
      el.removeEventListener('canplay', onReady);
      el.removeEventListener('suspend', onSuspend);
      el.removeEventListener('waiting', onWaiting);
      el.removeEventListener('error', onError);
    },
  };
}
