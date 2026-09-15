import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import HomePage from './features/home/HomePage';
import HostPage from './features/host/HostPage';
import JoinPage from './features/player/join/JoinPage';
import PlayerPage from './features/player/PlayerPage';

import './styles/index.css';

/**
 * Two devices, four routes.
 *
 * `/` is the host's password gate and reads on either device. `/host` is the
 * television. `/play` and `/play/game` are the phone: the door and the
 * controller, split so that a reload lands back where it was rather than on a
 * form for a game you're already in.
 *
 * No layout route and no app-wide providers: the session lives in
 * `services/quizwizz/store.ts`, which is a module-scope observable rather than a
 * context, so the socket and React share one truth without anything having to
 * wrap the tree.
 */
const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/host', element: <HostPage /> },
  { path: '/play', element: <JoinPage /> },
  { path: '/play/game', element: <PlayerPage /> },
]);

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container missing in index.html');
}

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
