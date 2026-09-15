/**
 * React bindings for the on-chain layer. `services/solana` holds the facts and
 * the adapters; these hold the wallet gestures the UI performs.
 *
 * Note what isn't here: a wrapper around `useWallet`. That hook is already the
 * app-wide view of the adapter, and re-exporting it through a hook of our own
 * would only add a place for it to drift.
 */
export * from './solana/useWalletConnect';
export * from './solana/useSendTransaction';
