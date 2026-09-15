import { useWalletConnect } from '../hooks/solana';
import { useAuth } from '../context/AuthContext';

/**
 * Connect, or — once you're in — get back out. One button for both.
 *
 * "In" is a session *or* a connected adapter, not just the adapter: a dev key
 * signs in with nothing attached, and a wallet can be connected before it's been
 * proved. Either way this is the way out, so it says so on its face rather than
 * on hover — there is no hover on a phone.
 */
export function ConnectWalletButton() {
  const { connected, connecting, toggle } = useWalletConnect();
  const { isAuthed, logout } = useAuth();

  const signedIn = isAuthed || connected;

  // Drop the session, then the adapter if there is one. `toggle` would *connect*
  // when nothing is attached, which is the opposite of what this button just said.
  const handleClick = async () => {
    if (signedIn) {
      logout();
      if (connected) await toggle();
      return;
    }
    await toggle();
  };

  const label = connecting ? 'Connecting...' : signedIn ? 'Disconnect' : 'Connect';
  const variant = signedIn ? 'back' : 'secondary';

  return (
    <button
      onClick={() => void handleClick()}
      disabled={connecting}
      className={`${variant} ${connecting ? 'opacity-55 cursor-not-allowed' : ''}`.trim()}
    >
      {label}
    </button>
  );
}
