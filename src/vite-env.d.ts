/// <reference types="vite/client" />

interface Window {
  /**
   * The dev server's LAN origin, injected by the `quizwizz:lan-origin` plugin in
   * `vite.config.ts`. Present only under `vite --host`; never in a build.
   */
  __LAN_ORIGIN__?: string;
}
