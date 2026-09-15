import { useCallback, useEffect, useState } from 'react';
import { bopSong } from '../../services/slopbop';

const BOPPED_KEY = 'slopbop_bops';

function getBopped(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(BOPPED_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function markBopped(songId: string) {
  const bopped = getBopped();
  if (bopped.includes(songId)) return;
  localStorage.setItem(BOPPED_KEY, JSON.stringify([...bopped, songId]));
}

/**
 * Local-first bopping, shared by every surface that offers the button. One bop
 * per song, remembered in localStorage so the button stays spent across
 * surfaces (they read the same key) and survives reloads.
 *
 * That memory is the *only* thing stopping a double count — the endpoint is
 * neither idempotent nor authenticated, so it happily counts a held-down
 * button. Clearing storage buys another bop; that's accepted, the point is to
 * make the honest path count once, not to make cheating impossible.
 *
 * `bops` seeds from the track and updates to the server's fresh count once a
 * bop lands.
 */
export function useSongBop(songId: string | undefined, initialBops?: number) {
  const [bops, setBops] = useState(initialBops ?? 0);
  const [bopped, setBopped] = useState(false);
  const [bopping, setBopping] = useState(false);

  useEffect(() => {
    setBops(initialBops ?? 0);
    setBopped(songId ? getBopped().includes(songId) : false);
  }, [songId, initialBops]);

  const bop = useCallback(async () => {
    if (!songId || bopped || bopping) return;
    // Spend the button before the request, not after — a slow network is
    // exactly when a second tap arrives.
    setBopping(true);
    setBopped(true);
    markBopped(songId);
    try {
      setBops(await bopSong(songId));
    } catch {
      // The count stays where it was; the button stays spent. Re-opening the
      // door here would just invite the double-count we're guarding against.
    } finally {
      setBopping(false);
    }
  }, [songId, bopped, bopping]);

  return { bops, bopped, bopping, bop };
}
