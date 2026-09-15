/**
 * Which cluster we're on, and how a `Connection` reaches it.
 *
 * Driven by VITE_SOL_NETWORK ('mainnet' or 'devnet', defaulting to devnet) and
 * VITE_HELIUS_API_KEY. Nothing here opens a socket — this is the description of
 * the endpoint, handed to `ConnectionProvider` at the app root.
 */

import type { ConnectionConfig } from '@solana/web3.js';

type SolanaNetwork = 'devnet' | 'mainnet-beta';

const networkEnv = import.meta.env.VITE_SOL_NETWORK || 'devnet';

// Map env value to Solana cluster name
export const SOLANA_NETWORK: SolanaNetwork =
  networkEnv === 'mainnet' ? 'mainnet-beta' : 'devnet';

// Chain identifier for Mobile Wallet Adapter
export const SOLANA_CHAIN = `solana:${networkEnv}` as `solana:${string}`;

// Helius RPC URL based on network
const HELIUS_API_KEY = import.meta.env.VITE_HELIUS_API_KEY || '';

/** Whether an RPC endpoint is actually usable. False until VITE_HELIUS_API_KEY is set. */
export const HAS_RPC = HELIUS_API_KEY !== '';

export const HELIUS_RPC_URL = networkEnv === 'mainnet'
  ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  : `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

/**
 * Connection config for `ConnectionProvider`.
 *
 * Without a key the URL above is still *well-formed* — `.../?api-key=` — so a
 * `Connection` builds happily and the first request comes back as a Helius auth
 * error that says nothing about the real cause. This intercepts that request and
 * fails with the actual reason instead.
 *
 * Deliberately at the fetch layer rather than at module load: nothing in the app
 * opens an RPC connection today (auth is signature-only, which never touches the
 * network), so throwing on import would break a working app over a variable it
 * doesn't use. The error arrives the moment something genuinely needs RPC, and
 * not one moment sooner — which makes it the door the first on-chain read walks
 * through.
 */
export const RPC_CONFIG: ConnectionConfig = {
  commitment: 'confirmed',
  fetch: (...args) => {
    if (!HAS_RPC) {
      return Promise.reject(
        new Error(
          'Solana RPC is not configured: VITE_HELIUS_API_KEY is unset, so ' +
            `${networkEnv} requests would go to Helius without a key. Set it in .env ` +
            'to enable on-chain reads and transactions.',
        ),
      );
    }
    return fetch(...args);
  },
};

// Helper to check if we're on mainnet
export const IS_MAINNET = networkEnv === 'mainnet';
