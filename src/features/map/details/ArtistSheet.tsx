import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BottomSheet } from '../../../primitives/BottomSheet';
import Img from '../../../primitives/Img';
import { useSim } from '../../../context/SimContext';
import { Artist } from '../../../services/slopbop';
import { ArtistStatus } from './ArtistStatus';
import { ArtistBars } from './ArtistBars';
import { ArtistJournal } from './ArtistJournal';

type Tab = 'status' | 'journal';

const TABS: { id: Tab; label: string }[] = [
  { id: 'status', label: 'Status' },
  { id: 'journal', label: 'Journal' },
];

// Bottom sheet for a tapped agent: identity and a "view profile" link to
// their static page, then a tabbed view of their live simulation data —
// status, song ideas (bars) and activity journal. `artist` stays set while
// the sheet animates closed so its content doesn't blank out mid-slide.
export function ArtistSheet({
  open,
  onClose,
  artist,
}: {
  open: boolean;
  onClose: () => void;
  artist: Artist | null;
}) {
  const { sim } = useSim();
  const [tab, setTab] = useState<Tab>('status');

  // Each fresh open starts on the status tab.
  useEffect(() => {
    if (open) setTab('status');
  }, [open]);

  return (
    <BottomSheet open={open} onClose={onClose} flush>
      {artist && (
        <div className="flex flex-col h-full">
          {/* Fixed header — identity, profile link, tab switcher */}
          <div className="flex flex-col gap-md px-xl pt-lg pb-md shrink-0">
            <div className="flex items-start gap-md">
              <Img
                src={artist.image_url ?? '/Images/mystery-actor.png'}
                alt={artist.name}
                className="w-24 h-24 rounded-lg shrink-0"
                imgClassName="object-cover object-top"
              />
              <div className="flex flex-col gap-xs min-w-0">
                <span className="font-display text-lg truncate">{artist.name}</span>
                <Link
                  to={`/artists/${artist.artist_id}`}
                  onClick={onClose}
                  className="self-start rounded-lg border border-border px-md py-xs text-sm font-display uppercase tracking-wide active:opacity-70 transition-opacity"
                >
                  View Profile
                </Link>
              </div>
            </div>

            {/* Tab switcher — lightweight text buttons */}
            <div className="flex items-center justify-center gap-md font-display text-base uppercase tracking-wide">
              {TABS.map((t, i) => (
                <Fragment key={t.id}>
                  {i > 0 && <span className="text-muted">|</span>}
                  <button
                    onClick={() => setTab(t.id)}
                    className={`transition-colors ${
                      tab === t.id
                        ? 'text-accent underline underline-offset-4'
                        : 'text-muted active:opacity-70'
                    }`}
                  >
                    {t.label}
                  </button>
                </Fragment>
              ))}
            </div>
          </div>

          {/* Selected tab — the only part that scrolls */}
          <div className="flex-1 min-h-0 overflow-y-auto px-xl pb-xl">
            {tab === 'status' && (
              <div className="flex flex-col gap-xl">
                <ArtistStatus artistId={artist.artist_id} />
                {sim && (
                  <>
                    <div className="border-t border-border" />
                    <ArtistBars
                      simulationId={sim.simulation_id}
                      artistId={artist.artist_id}
                      live={open}
                    />
                  </>
                )}
              </div>
            )}
            {tab === 'journal' &&
              (sim ? (
                <ArtistJournal
                  simulationId={sim.simulation_id}
                  artistId={artist.artist_id}
                  live={open}
                />
              ) : (
                <p className="text-center text-muted text-sm py-3xl">
                  Not part of a running simulation.
                </p>
              ))}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
