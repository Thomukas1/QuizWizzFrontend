import { useSyncExternalStore } from 'react';
import { activeGateway, subscribeToGateway } from '../../services/arweave';

/**
 * The gateway the app is currently serving media from. Re-renders when it moves,
 * so an already-mounted image re-points the moment anything else finds a better
 * host — see `services/arweave/gateways`.
 */
export function useGateway(): string {
  return useSyncExternalStore(subscribeToGateway, activeGateway, activeGateway);
}
