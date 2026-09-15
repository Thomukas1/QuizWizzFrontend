import { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ConnectWalletButton } from '../../components/ConnectWalletButton';
import { useWalletConnect } from '../../hooks/solana';
import { useAuth } from '../../context/AuthContext';

/**
 * Where the Account tab lands, and the only place a real wallet signs in.
 *
 * A landing, not a destination: controlling exactly one artist there's nothing to
 * ask, so it redirects (`replace`) to that artist's page. Every other answer is a
 * state of this page — pick between several, an audience account, or a wallet
 * still to prove.
 *
 * **Controlling no artist is valid and finished**, not a rejection: most signed-in
 * people are audience. The signature fires on its own once a wallet connects,
 * which is honest because arriving here *is* the intent to sign in.
 */
export default function AccountPage() {
  // Two different addresses, deliberately. `connected` is the wallet waiting to
  // be proved; `userId` is the key the session was actually issued for — and the
  // only one that exists when a dev key signed in with no adapter attached.
  const { address: connected } = useWalletConnect();
  const { userId, isAuthed, artists, loading, error, login } = useAuth();

  // Connecting is the whole gesture — the signature prompt follows on its own
  // rather than behind a second button nobody asked for.
  //
  // `error` is what stops it looping: a refusal leaves it set, and every path
  // that clears it is a deliberate restart — `beginSignIn` on the retry button,
  // `signOut` when a wallet disconnects or switches address. So a rejected prompt
  // waits, and connecting a different wallet still signs in on its own.
  useEffect(() => {
    if (!connected || isAuthed || loading || error) return;
    login().catch(() => {
      /* surfaced through `error` below */
    });
  }, [connected, isAuthed, loading, error, login]);

  // One artist and you're in: this page had one question and it's answered.
  // Checked before `loading` so the redirect happens the moment /auth/me lands.
  const soleArtist = isAuthed && artists.length === 1 ? artists[0] : null;
  if (soleArtist) {
    return <Navigate to={`/artists/${soleArtist.artist_id}`} replace />;
  }

  return (
    <div className="flex flex-col items-center gap-lg py-4xl px-md text-center">
      {/* Only while there's still a login to do — it's the wrong title for a
          page you've already signed in to. */}
      {!isAuthed && <h1 className="font-display text-xl">Login Portal</h1>}

      {loading ? (
        // Signed in already means this is the account load on a restored token —
        // there's no signature being waited on, so it doesn't claim there is.
        <>
          <div className="spinner large processing" />
          {!isAuthed && (
            <>
              <p>Sign the message in your wallet to prove it&apos;s yours.</p>
              <p className="subtle text-xs">No transaction, no fee.</p>
            </>
          )}
        </>
      ) : (
        <>
          <Copy
            userId={userId}
            connected={connected}
            isAuthed={isAuthed}
            artistCount={artists.length}
          />

          {error && <p className="text-danger">{error}</p>}

          {/* Several artists on one account — it can't pick for you. Quiet,
              bordered rows so the accent stays with the wallet button. */}
          {isAuthed && artists.length > 1 && (
            <div className="w-full flex flex-col gap-sm">
              {artists.map(artist => (
                <Link
                  key={artist.artist_id}
                  to={`/artists/${artist.artist_id}`}
                  className="w-full rounded-lg border border-border px-lg py-md font-display uppercase text-sm tracking-wide active:opacity-70 transition-opacity"
                >
                  {artist.name}
                </Link>
              ))}
            </div>
          )}

          <ConnectWalletButton />

          {error && connected && (
            <button
              type="button"
              onClick={() => void login()}
              className="text-sm text-muted underline underline-offset-4 active:opacity-70 transition-opacity"
            >
              Try signing again
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Copy({
  userId,
  connected,
  isAuthed,
  artistCount,
}: {
  userId: string | null;
  connected: string | null;
  isAuthed: boolean;
  artistCount: number;
}) {
  // Signed in, no artist — the ordinary case, and a complete one. It says what
  // the session *is* rather than what it lacks. The address comes from `userId`,
  // the key the token was issued for: `connected` is empty when a dev key signed
  // in, which is how this used to read "Signed in as this wallet".
  if (isAuthed && artistCount === 0) {
    return (
      <>
        <p>
          Signed in as: <span className="highlight">{shorten(userId)}</span>
        </p>
        <p className="subtle text-xs">You are not yet an artist...</p>
      </>
    );
  }

  if (isAuthed) {
    return <p>You manage more than one artist. Pick one to open.</p>;
  }

  if (connected) {
    return <p>Sign the message in your wallet to finish connecting.</p>;
  }

  return (
    <p>
      Login with a Solana wallet to access and manage your{' '}
      <span className="highlight">synthetic artist</span>.
    </p>
  );
}

function shorten(address: string | null): string {
  if (!address) return 'this wallet';
  return `${address.slice(0, 4)}..${address.slice(-4)}`;
}
