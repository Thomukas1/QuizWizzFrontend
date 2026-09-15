import { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { SolanaMobileWalletAdapterWalletName } from '@solana-mobile/wallet-standard-mobile';

/**
 * One gesture for connecting and disconnecting, plus the platform decision behind
 * it: on a phone the mobile adapter is already registered and gets selected
 * outright, on desktop the modal opens. Connecting is all this does — proving the
 * wallet is `signInWithWallet`'s job.
 */
export interface WalletConnect {
  connected: boolean;
  connecting: boolean;
  /** The connected address, base58, or null. */
  address: string | null;
  /** Connect if disconnected, disconnect if connected. */
  toggle: () => Promise<void>;
}

export function useWalletConnect(): WalletConnect {
  const {
    wallet,
    wallets,
    connected,
    connecting,
    connect,
    disconnect,
    select,
  } = useWallet();

  const { setVisible: setModalVisible } = useWalletModal();

  const toggle = useCallback(async () => {
    if (connected) {
      await disconnect();
      return;
    }

    // Already on the mobile adapter — connecting hands off to the wallet app.
    if (wallet?.adapter.name === SolanaMobileWalletAdapterWalletName) {
      await connect();
      return;
    }

    // Registered but not selected: choosing it is enough, since `autoConnect`
    // takes it from there.
    const mwa = wallets.find(w => w.adapter.name === SolanaMobileWalletAdapterWalletName);
    if (mwa) {
      await select(mwa.adapter.name);
      return;
    }

    setModalVisible(true);
  }, [connected, disconnect, connect, wallet, wallets, select, setModalVisible]);

  return {
    connected,
    connecting,
    address: wallet?.adapter.publicKey?.toBase58() ?? null,
    toggle,
  };
}
