import { useEffect, useRef } from 'react';
import { useArweaveImage } from '../hooks/arweave';

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  /** Box classes (size, aspect ratio, rounding) applied to the frame wrapper. */
  className?: string;
  /** object-fit / object-position classes applied to the <img> itself. Defaults to `object-cover`. */
  imgClassName?: string;
  /**
   * Optional tiny/low-res image URL shown blurred while the full image loads (true "blur-up").
   * When omitted, an animated shimmer skeleton is shown instead.
   */
  placeholderSrc?: string;
};

/**
 * Remote image with a placeholder + fade-in.
 *
 * Fixes the "reveals slowly from the top" effect on slow connections by decoding
 * off-thread (`decoding="async"`) and fading the whole image in at once, over a
 * shimmer (or a blurred low-res `placeholderSrc`). `loading="lazy"` means offscreen
 * images (grids, lists) aren't fetched until they scroll into view.
 *
 * Note: this improves *perceived* speed only — it can't shrink the download.
 * Serving smaller variants + `Cache-Control` headers from the server is the real fix.
 *
 * Which gateway serves it, and what happens when that gateway doesn't, belong to
 * `useArweaveImage`. What's left here is presentation: a failed load is retried
 * quietly under the shimmer rather than shown as a broken frame, and the request
 * is made in CORS mode so the service worker sees a real status. Without that the
 * response is opaque, and Workbox can't tell a gateway blip from the image —
 * it would cache the blip *as* the image, permanently.
 */
export default function Img({
  className = '',
  imgClassName = 'object-cover',
  placeholderSrc,
  loading = 'lazy',
  onLoad,
  onError,
  alt = '',
  src,
  ...rest
}: Props) {
  const ref = useRef<HTMLImageElement>(null);
  const image = useArweaveImage(typeof src === 'string' ? src : undefined);
  const shown = typeof src === 'string' ? image.src : src;

  // Cached images may finish before React attaches onLoad — reveal them immediately.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth > 0) image.onLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, image.key]);

  return (
    <span className={`img-frame ${className}`}>
      {placeholderSrc ? (
        <img
          src={placeholderSrc}
          alt=""
          aria-hidden="true"
          className={`img-blur ${imgClassName}`}
          data-hidden={image.settled || undefined}
        />
      ) : (
        <span className="img-shimmer" data-hidden={image.settled || undefined} aria-hidden="true" />
      )}
      <img
        {...rest}
        key={image.key}
        ref={ref}
        src={shown}
        alt={alt}
        crossOrigin={image.routed ? 'anonymous' : undefined}
        loading={loading}
        decoding="async"
        className={`img-el ${imgClassName}`}
        data-loaded={image.settled || undefined}
        onLoad={(e) => {
          image.onLoad();
          onLoad?.(e);
        }}
        onError={(e) => {
          // Retrying under the shimmer, so a blip never shows as a broken frame.
          // Only once there's nowhere left to try does this surface.
          image.onError().then(givenUp => {
            if (givenUp) onError?.(e);
          });
        }}
      />
    </span>
  );
}
