/**
 * The on-chain layer: which cluster, which wallets, how a signature is formatted
 * for the backend, and the dev key that stands in for a wallet.
 *
 * Deliberately thin — `@solana/wallet-adapter-react` is already the service layer
 * for connecting and signing, so there's no `Connection` singleton here
 * (`ConnectionProvider` holds it) and no wrapper around `useWallet`
 * (`hooks/solana/` is the React face). Transactions belong here when they arrive;
 * `RPC_CONFIG` already fails loudly the moment one needs an endpoint.
 */

export {
  SOLANA_NETWORK,
  SOLANA_CHAIN,
  HELIUS_RPC_URL,
  RPC_CONFIG,
  HAS_RPC,
  IS_MAINNET,
} from './solana/network';

export { bootstrapSolana, solanaWallets } from './solana/wallets';

export { signMessageBase58, signTransactionBase64 } from './solana/signing';
export type { TransactionSigner } from './solana/signing';

export { devSigner } from './solana/devSigner';
export type { DevSigner } from './solana/devSigner';
