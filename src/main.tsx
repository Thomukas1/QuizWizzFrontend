import { Buffer } from 'buffer';
window.Buffer = Buffer;

import { StrictMode, ReactNode, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  useLocation,
} from 'react-router-dom';

import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';

import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

import ArtistProfile from './features/artist_profile/ArtistProfile';
import ImageStudioPage from './features/image_studio/ImageStudioPage';
import { NavBar } from './components/NavBar';
import AlbumPage from './features/album/AlbumPage';
import MixtapePage from './features/mixtape/MixtapePage';
import JamPage from './features/jam/JamPage';
import MapPage from './features/map/MapPage';
import AboutPage from './features/about/AboutPage';
import RosterPage from './features/roster/RosterPage';
import CommissionPage from './features/commission/CommissionPage';
import ApplicationForm from './features/apply/ApplicationForm';
import AccountPage from './features/account/AccountPage';
import { bootstrapSolana, solanaWallets, HELIUS_RPC_URL, RPC_CONFIG } from './services/solana';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { MusicPlayerProvider } from './context/MusicPlayerContext';
import MusicPlayer from './components/MusicPlayer';
import MiniPlayer from './components/MiniPlayer';

import './styles/index.css';
import '@solana/wallet-adapter-react-ui/styles.css';

/**
 * ---------------------------------------------------------
 * Solana bootstrap
 * ---------------------------------------------------------
 * Wallet Standard / MWA registration and the stored wallet selection. This MUST
 * run once, before React renders — see `services/solana/wallets.ts`.
 */
bootstrapSolana();

interface WalletContextProviderProps {
  children: ReactNode;
}

function WalletContextProvider({ children }: WalletContextProviderProps) {
  // Once — a fresh array would make WalletProvider re-resolve its wallets.
  const wallets = useMemo(() => solanaWallets(), []);

  return (
    <ConnectionProvider endpoint={HELIUS_RPC_URL} config={RPC_CONFIG}>
      <WalletProvider wallets={wallets} autoConnect={true}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

/**
 * ---------------------------------------------------------
 * App bootstrap
 * ---------------------------------------------------------
 */

/**
 * Reset scroll to the top on every route change. The scroll container is the
 * <html> element (see index.css), so React Router leaves it wherever the last
 * page was — without this, navigating lands you mid-page.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.documentElement.scrollTo({ top: 0, left: 0 });
  }, [pathname]);
  return null;
}

// Diagonal channel-change static bands. Count / colour / scattered pop-in delay
// are data-driven here so transitions.css stays generic; positions are % of the
// (rotated, oversized) overlay. `(i * 7) % 16` scatters the delays so the bands
// don't fill in top-to-bottom. Max delay ~150ms → they all overlap at full
// cover around 220–290ms, which is when the NavBar swaps the route.
const TV_BAND_COUNT = 12;
const TV_BAND_COLORS = ['var(--p-navy)', 'var(--p-lime)', 'var(--p-cobalt)'];
const TV_BANDS = Array.from({ length: TV_BAND_COUNT }, (_, i) => ({
  top: `calc(${i} * 100% / ${TV_BAND_COUNT})`,
  height: `calc(100% / ${TV_BAND_COUNT} + 1px)`,
  background: TV_BAND_COLORS[i % TV_BAND_COLORS.length],
  animationDelay: `${((i * 7) % 16) * 10}ms`,
}));

/**
 * Persistent app shell. The routed page renders in <Outlet />; the chrome
 * around it (nav, players) and ScrollToTop live here so they stay mounted
 * across navigations — the MusicPlayer's audio element in particular must not
 * remount. This is the layout route that wraps every page below.
 */
function RootLayout() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
      <NavBar />
      <MiniPlayer />
      <MusicPlayer />
      {/* Channel-change static overlay — diagonal bands that pop in to cover
          the screen. Inert until the NavBar toggles `.tv-switching` on <html>
          during a page change (see transitions.css). */}
      <div className="tv-static" aria-hidden="true">
        {TV_BANDS.map((style, i) => (
          <span key={i} className="tv-band" style={style} />
        ))}
      </div>
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <AboutPage /> },
      { path: '/about', element: <AboutPage /> },
      { path: '/roster', element: <RosterPage /> },
      { path: '/commission', element: <CommissionPage /> },
      { path: '/map', element: <MapPage /> },
      { path: '/apply', element: <ApplicationForm /> },
      // The Account tab's destination. It resolves to the artist page when the
      // session points at exactly one artist, so it's a landing rather than a
      // place you stay — see features/account/AccountPage.tsx.
      { path: '/account', element: <AccountPage /> },
      { path: '/artists/:id', element: <ArtistProfile /> },
      // Owner-only in practice — the page checks `is_owner` and every endpoint
      // behind it is owner-gated server-side. Under the artist, because it's one
      // artist's work rather than a place of its own.
      { path: '/artists/:id/studio', element: <ImageStudioPage /> },
      { path: '/albums/:id', element: <AlbumPage /> },
      { path: '/mixtapes/:id', element: <MixtapePage /> },
      { path: '/jams/:id', element: <JamPage /> },
    ],
  },
]);

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container missing in index.html');
}

createRoot(container).render(
  <StrictMode>
    <WalletContextProvider>
      {/* Inside the wallet providers — the session is built from the adapter's
          connected key — and outside the router, so the nav and every page read
          the same one session. */}
      <AuthProvider>
        <ToastProvider>
          <MusicPlayerProvider>
            <RouterProvider router={router} />
          </MusicPlayerProvider>
        </ToastProvider>
      </AuthProvider>
    </WalletContextProvider>
  </StrictMode>
);
