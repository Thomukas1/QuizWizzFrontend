import type { Adapter } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import {
  registerMwa,
  createDefaultAuthorizationCache,
  createDefaultChainSelector,
  createDefaultWalletNotFoundHandler,
} from '@solana-mobile/wallet-standard-mobile';
import { SOLANA_CHAIN } from './network';

/** Publishes the mobile wallet through Wallet Standard. Must run before React renders. */
export function bootstrapSolana() {
  registerMwa({
    appIdentity: {
      name: 'Slop Bop',
      uri: window.location.origin,
      icon: '/Branding/logo-full.png', // must exist in /public
    },
    authorizationCache: createDefaultAuthorizationCache(),
    chains: [SOLANA_CHAIN],
    chainSelector: createDefaultChainSelector(),
    onWalletNotFound: createDefaultWalletNotFoundHandler(),
  });
}

/**
 * Desktop adapters for `WalletProvider`. Wallet Standard and MWA wallets inject
 * themselves, so listing them here would double them up. Memoize the result — a
 * fresh array makes `WalletProvider` re-resolve its wallets.
 */
export function solanaWallets(): Adapter[] {
  return [new PhantomWalletAdapter(), new SolflareWalletAdapter()];
}
