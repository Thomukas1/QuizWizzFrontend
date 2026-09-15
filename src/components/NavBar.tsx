import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Tab = {
  path: string;
  emoji: string;
  label: string;
};

// Four routes, nothing conditional. Account included: where it leads is
// AccountPage's decision, not the nav's — the nav only navigates.
const TABS: Tab[] = [
  { path: '/', emoji: '🎪', label: 'About' },
  { path: '/roster', emoji: '🎭', label: 'Roster' },
  { path: '/commission', emoji: '💽', label: 'Mixtape' },
  { path: '/account', emoji: '👩🏻‍🎤', label: 'Account' },
  // Deferred — the route still works, just hidden from the nav for now.
  // Restore by re-adding this entry when Map comes back.
  // { path: '/map', emoji: '🗺️', label: 'Map' },
  // Apply is deliberately absent: it's reached from the end of the Roster, not
  // from a tab of its own.
];

export function NavBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { artists } = useAuth();

  // Channel-change static: themed noise bands pop in to cover the page (the CSS
  // for `.tv-switching` lives in transitions.css), swap the route ~230ms in
  // (while the bands fully cover the screen) so the cut is hidden, then clear
  // the class after the burst ends. Reduced-motion users skip it.
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const handleNav = useCallback((path: string) => {
    if (path === pathname) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      navigate(path);
      return;
    }

    const root = document.documentElement;
    timers.current.forEach(clearTimeout);
    // Restart the burst cleanly if one's still mid-flight.
    root.classList.remove('tv-switching');
    void root.offsetWidth; // force reflow so the animation re-triggers
    root.classList.add('tv-switching');

    timers.current = [
      window.setTimeout(() => navigate(path), 250),
      window.setTimeout(() => root.classList.remove('tv-switching'), 510),
    ];
  }, [pathname, navigate]);

  // Account also lights up on an artist you control, because that's where
  // /account sends you — the tab would otherwise go dark the instant it worked.
  // Highlighting only; the destination stays a plain path.
  const isActive = (tab: Tab) =>
    pathname === tab.path ||
    (tab.path === '/account' && artists.some(a => pathname === `/artists/${a.artist_id}`));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-fixed h-[60px] bg-surface-2 border-t border-border">
      <div className="max-w-[430px] mx-auto h-full flex items-center justify-around">
        {TABS.map(tab => (
          <button
            key={tab.label}
            type="button"
            onClick={() => handleNav(tab.path)}
            // px-4, not the px-8 three tabs used to wear — four don't fit at 430px.
            className={`flex flex-col items-center gap-0.5 px-4 h-full justify-center transition-base ${
              isActive(tab) ? 'text-accent' : 'text-muted'
            }`}
          >
            <span className="text-xl leading-none">{tab.emoji}</span>
            <span className="text-[10px] font-medium uppercase tracking-wider">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
