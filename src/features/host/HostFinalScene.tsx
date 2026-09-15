import { useMemo } from 'react';
import { Confetti } from '../../components/Confetti';
import { GameZone } from '../../components/GameZone';
import { Podium } from '../../components/Podium';
import { rankPlayers } from '../../components/standings';
import type { EmojiFeed } from '../../components/EmojiStream';
import type { PublicPlayer } from '../../services/quizwizz';

/**
 * **FINAL, in the game zone.** The loudest screen of the evening, so it is the
 * one that gets confetti.
 *
 * Only the podium: the full standings are already in the right-hand panel and
 * have been all night, so repeating them here would be the same list twice on
 * one screen. The top three are a *picture*; the rest are a list, and the layout
 * already has somewhere for each.
 */
export function HostFinal({ players, feed }: { players: PublicPlayer[]; feed: EmojiFeed | null }) {
  const top = useMemo(() => rankPlayers(players).slice(0, 3), [players]);

  return (
    <GameZone
      feed={feed}
      backdrop={<Confetti />}
      top={<h2 className="game-zone__title">FINAL RESULTS</h2>}
      bottom={<p className="game-zone__footnote">Thanks for playing!</p>}
    >
      {top.length > 0 ? <Podium top={top} /> : <p className="subtle">Nobody played.</p>}
    </GameZone>
  );
}
