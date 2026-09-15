import bs58 from 'bs58';
import { VersionedTransaction } from '@solana/web3.js';

/**
 * How a signed message crosses the wire: base58 of the raw ed25519 bytes, over
 * the message's UTF-8 exactly as issued. Both halves live here because getting
 * either wrong fails verification the same way.
 */
export async function signMessageBase58(
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
  message: string,
): Promise<string> {
  return bs58.encode(await signMessage(new TextEncoder().encode(message)));
}

/** Signs a transaction. Both a wallet adapter and `devSigner()` satisfy this. */
export type TransactionSigner = <T extends VersionedTransaction>(tx: T) => Promise<T>;

/**
 * Sign a transaction the backend built, and hand back what `/tx/submit` wants.
 *
 * Base64 in, base64 out, versioned throughout — the backend builds v0 and
 * deserializes v0, so a legacy `Transaction` anywhere in this path would fail at
 * the far end rather than here.
 */
export async function signTransactionBase64(
  signTransaction: TransactionSigner,
  unsigned: string,
): Promise<string> {
  const signed = await signTransaction(VersionedTransaction.deserialize(fromBase64(unsigned)));
  return toBase64(signed.serialize());
}

const fromBase64 = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));

function toBase64(bytes: Uint8Array): string {
  // Built in a loop rather than by spreading into String.fromCharCode, which
  // overflows the argument limit on anything large.
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
