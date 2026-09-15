/**
 * Arweave media: which gateway serves it, and how each kind of file gets loaded.
 *
 * One import surface, one loader per medium — `media` for audio and video,
 * `image` for images, `fetch` for genuine downloads. They apply a single policy
 * (`arweave/policy.ts`) against a single app-wide gateway choice
 * (`arweave/gateways.ts`), so a fix here reaches every asset in the app.
 *
 * The deadlines themselves are deliberately not re-exported: the handlers apply
 * them, and a consumer reaching for a raw one is a consumer about to
 * re-implement a handler. `IMAGE_SWAP_MS` is the exception — an `<img>` is
 * remounted by its renderer, so its deadline has to be armed there.
 */

export { createMediaLoader } from './arweave/media';
export type { MediaLoader, MediaLoaderCallbacks } from './arweave/media';

export { createImageLoader } from './arweave/image';
export type { ImageLoader, ImageOutcome } from './arweave/image';

export { fetchArweave } from './arweave/fetch';

export { IMAGE_SWAP_MS } from './arweave/policy';

export {
  TRUSTED_GATEWAYS,
  activeGateway,
  assetUrl,
  demoteGateway,
  isGatewayUrl,
  subscribeToGateway,
} from './arweave/gateways';
