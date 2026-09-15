import { Keypair, Transaction, VersionedTransaction } from '@solana/web3.js';
import { ed25519 } from '@noble/curves/ed25519';
import bs58 from 'bs58';

/**
 * Dev-only signer built from a private key in `.env.local` — no wallet, no
 * extension, no popup. Set `VITE_DEV_WALLET_KEY` and you are that wallet on every
 * reload; unset it and the normal wallet flow comes back.
 *
 * `.env.local` is still read during `vite build`, so the guarantee is entirely
 * this: every read of the key sits behind `import.meta.env.DEV`, which is `false`
 * in a production build, making these branches dead code so the secret drops out
 * before it can reach `dist/`. Re-verify after editing this file by building and
 * grepping `dist/` for the value. Use a throwaway keypair.
 */

export interface DevSigner {
  address: string;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
}

/** Accepts either the JSON byte array `solana-keygen` writes or a base58 secret key. */
function parseSecretKey(raw: string): Uint8Array {
  const trimmed = raw.trim();
  return trimmed.startsWith('[')
    ? Uint8Array.from(JSON.parse(trimmed) as number[])
    : bs58.decode(trimmed);
}

function devKeypair(): Keypair | null {
  // First statement, deliberately — this is what folds the secret out of a build.
  if (!import.meta.env.DEV) return null;

  const secret = import.meta.env.VITE_DEV_WALLET_KEY;
  if (!secret) return null;

  try {
    return Keypair.fromSecretKey(parseSecretKey(secret));
  } catch (err) {
    console.error(
      '[dev key] VITE_DEV_WALLET_KEY is not a valid secret key — expected a 64-byte JSON ' +
        'array or a base58 string.',
      err,
    );
    return null;
  }
}

// Built once. The keypair can't change at runtime, and this is called from
// render — an unmemoized version would re-parse the key and re-log on every one.
let cached: DevSigner | null | undefined;

/** The dev signer, or null when the key isn't set or this isn't a dev build. */
export function devSigner(): DevSigner | null {
  if (cached === undefined) cached = build();
  return cached;
}

function build(): DevSigner | null {
  const keypair = devKeypair();
  if (!keypair) return null;

  const address = keypair.publicKey.toBase58();
  console.info(
    `%c[dev key]%c signed in as ${address} — unset VITE_DEV_WALLET_KEY for the real wallet flow.`,
    'color:#B6F833;font-weight:bold',
    'color:inherit',
  );

  return {
    address,
    // The 64-byte secret key is seed ‖ public key; ed25519 signs from the seed.
    signMessage: async message => ed25519.sign(message, keypair.secretKey.slice(0, 32)),
    signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
      if (tx instanceof VersionedTransaction) tx.sign([keypair]);
      else tx.partialSign(keypair);
      return tx;
    },
  };
}
