import { Fragment } from 'react';
import { useSimArtistNotes } from '../../../hooks/sim';

interface Props {
  simulationId: string;
  artistId: string;
  // Poll for new notes while the bars tab is showing.
  live: boolean;
}

function unescapeNewlines(text: string): string {
  return text.replace(/\\n/g, '\n');
}

// An artist's song ideas, rendered on notebook-style lined paper. Notes are
// separated by an asterism divider, newest last.
export function ArtistBars({ simulationId, artistId, live }: Props) {
  const { notes, loading } = useSimArtistNotes(simulationId, artistId, { live });

  return (
    <div className="bars-page">
      {loading && notes.length === 0 ? (
        <div className="bars-empty">…</div>
      ) : notes.length === 0 ? (
        <div className="bars-empty">No bars yet.</div>
      ) : (
        notes.map((n, i) => (
          <Fragment key={`${n.sim_time}-${i}`}>
            {i > 0 && <div className="bars-divider">⁂</div>}
            <div className="bars-note">{unescapeNewlines(n.note)}</div>
          </Fragment>
        ))
      )}
    </div>
  );
}
