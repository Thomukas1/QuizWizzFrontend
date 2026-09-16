import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Hands the running page the dev server's **Network** URL — the
 * `http://192.168.x.x:5173/` Vite prints next to the Local one — as
 * `window.__LAN_ORIGIN__`.
 *
 * The browser cannot discover the machine's LAN address on its own, and the
 * host laptop opens the app on `localhost`, so without this the join QR encodes
 * an address that resolves to the *phone* scanning it. Node knows the answer;
 * this is the one place it can be handed across.
 *
 * It injects at `transformIndexHtml` rather than through `define` because
 * `server.resolvedUrls` is only populated once the server is listening, which
 * is after config is resolved but before the first HTML request. That timing is
 * also what makes the flag honest: run `vite` without `--host` and there is no
 * network URL, so nothing is injected and the join URL stays on localhost.
 */
/**
 * Vite prints a Network line per interface, and a machine running Tailscale, WSL
 * or Docker has several — the first one is whichever the OS enumerated first,
 * which is how the QR ends up encoding a `100.x` CGNAT address no phone in the
 * room can route to. Prefer the ranges a home router actually hands out.
 */
function pickLan(urls: readonly string[]): string | undefined {
  const rank = (host: string) =>
    /^192\.168\./.test(host) ? 0
    : /^10\./.test(host) ? 1
    : /^172\.(1[6-9]|2\d|3[01])\./.test(host) ? 2
    : 3
  return [...urls].sort((a, b) => rank(new URL(a).hostname) - rank(new URL(b).hostname))[0]
}

function lanOrigin(): Plugin {
  let server: ViteDevServer | undefined
  return {
    name: 'quizwizz:lan-origin',
    apply: 'serve',
    configureServer(s) {
      server = s
    },
    transformIndexHtml() {
      const url = pickLan(server?.resolvedUrls?.network ?? [])
      if (!url) return []
      return [
        {
          tag: 'script',
          injectTo: 'head-prepend',
          children: `window.__LAN_ORIGIN__ = ${JSON.stringify(new URL(url).origin)}`,
        },
      ]
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), lanOrigin()],
})
