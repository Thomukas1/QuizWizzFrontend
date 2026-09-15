import { useCallback, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { buildTransaction, submitTransaction, ApiError } from '../../services/slopbop';
import { devSigner, signTransactionBase64 } from '../../services/solana';

/**
 * Run one on-chain action end to end: build on the server, sign here, relay back.
 *
 * Command-shaped like the other wallet-gated mutations — call `send`, render from
 * `sending` and `error`. The dev key signs when it's set, exactly as it does for
 * sign-in, so transactions are exercisable without a wallet extension.
 *
 * Nothing here talks to an RPC node. The server owns the blockhash and the
 * submit, so a failure is either a build refusal (bad params, an account that
 * doesn't exist) or the chain rejecting the signed transaction — both arrive as
 * an `ApiError` with the reason in its message.
 */
export interface SendTransaction {
  /** Resolves to the on-chain signature. Rejects on a refusal at either end. */
  send: (action: string, params?: Record<string, unknown>) => Promise<string>;
  sending: boolean;
  error: string | null;
}

export function useSendTransaction(): SendTransaction {
  const { signTransaction } = useWallet();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (action: string, params: Record<string, unknown> = {}) => {
      // The dev key wins for the same reason it wins at sign-in: when it's set,
      // it's the wallet. Memoized, so this is cheap on every render.
      const sign = devSigner()?.signTransaction ?? signTransaction;
      if (!sign) throw new Error('Wallet cannot sign transactions');

      setSending(true);
      setError(null);
      try {
        const { transaction } = await buildTransaction(action, params);
        const signed = await signTransactionBase64(sign, transaction);
        const { signature } = await submitTransaction(signed);
        return signature;
      } catch (err) {
        setError(messageFor(err));
        throw err;
      } finally {
        setSending(false);
      }
    },
    [signTransaction],
  );

  return { send, sending, error };
}

function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404) return 'That action is not available.';
    // 400 from either endpoint is the useful one — bad params on the way in, or
    // the chain's own rejection on the way out. Both say what went wrong.
    return typeof err.body?.error === 'string' ? err.body.error : 'The transaction failed.';
  }
  if (err instanceof Error && /reject|denied|cancel/i.test(err.message)) {
    return 'Transaction was cancelled.';
  }
  return 'Could not complete the transaction.';
}
