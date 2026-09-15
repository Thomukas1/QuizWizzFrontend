import { apiFetch } from './client';

/**
 * On-chain actions, as HTTP. Two calls and one rule: **the backend builds, the
 * wallet signs, the backend relays.**
 *
 *   POST /tx/:action  → an unsigned transaction
 *   POST /tx/submit   → a signature
 *
 * That's why the frontend needs no RPC endpoint and no `VITE_HELIUS_API_KEY`:
 * blockhashes, program ids and account layouts are all the server's problem, and
 * the only thing that happens here is a signature. `signTransactionBase64` in
 * `services/solana` is the step between the two.
 *
 * A built transaction is an **offer**, not a reservation — it isn't recorded and
 * nothing is charged or held on the strength of it. It becomes real only when
 * signed and submitted, so abandoning one costs nothing.
 *
 * Both endpoints are wallet-gated: the fee payer is the proven token's wallet,
 * never something the client names.
 */

export interface BuiltTransaction {
  success: boolean;
  /** base64 of an unsigned `VersionedTransaction`. */
  transaction: string;
  blockhash: string;
  /** The transaction is dead past this slot — sign and submit promptly. */
  last_valid_block_height: number;
}

export interface SubmitResult {
  success: boolean;
  /** The on-chain transaction signature. */
  signature: string;
}

/** One kind of transaction this deployment knows how to build. */
export interface TxActionInfo {
  type: string;
  description?: string;
}

interface TxActionsResponse {
  success: boolean;
  actions: TxActionInfo[];
}

/**
 * Build an unsigned transaction. `action` is a registered type — `sol_transfer`
 * and `spl_transfer` ship built in, and a project adds rows to the registry
 * rather than routes. 404 means this deployment doesn't know that action; 400
 * means it does and the params were wrong.
 */
export const buildTransaction = (action: string, params: Record<string, unknown> = {}) =>
  apiFetch<BuiltTransaction>(`/slopbop/tx/${action}`, {
    method: 'POST',
    body: JSON.stringify(params),
  });

/**
 * Relay a signed transaction. The server never adds its own signature here — an
 * endpoint that signed on request would sign anything sent to it — so anything
 * needing a co-signature got it at build time.
 *
 * A 400 is the chain rejecting it, and the message is the RPC's.
 */
export const submitTransaction = (transaction: string) =>
  apiFetch<SubmitResult>('/slopbop/tx/submit', {
    method: 'POST',
    body: JSON.stringify({ transaction }),
  });

/** What this deployment can build. Open — no session needed. */
export const fetchTxActions = () =>
  apiFetch<TxActionsResponse>('/slopbop/tx/actions').then(r => r.actions);
