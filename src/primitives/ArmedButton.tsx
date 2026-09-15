import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * **A button that needs two taps.** The first arms it and changes the label, the
 * second does the thing, and it forgets the first tap after a few seconds.
 *
 * This is what a destructive control gets instead of a modal. A modal is a
 * heavier interruption than the mistake it prevents, and it has to be dismissed
 * even when you meant it; arming costs one extra tap, disarms itself, and — the
 * part a dialog can't do — leaves the answer *on the button you are already
 * looking at*. Both of the places this is used are rooms with people in them:
 * the host's remote, operated while talking to fifteen guests, and a phone that
 * somebody is holding sideways.
 *
 * It is a primitive because there is no domain in it. It doesn't know what it
 * ends, it doesn't style itself, and it sends nothing — the caller supplies both
 * labels, both class names and the action. That is also why the armed *look*
 * comes in as `armedClassName` rather than being defined here: a full-width
 * danger button on a television and a small ghost button in a phone header are
 * the same interaction and not remotely the same object.
 */

interface ArmedButtonProps {
  /** At rest. What the button does. */
  label: ReactNode;
  /** Armed. Phrase it as the confirmation — "Really?", "Tap again to wipe". */
  confirmLabel: ReactNode;
  onConfirm: () => void;
  className?: string;
  /** Appended while armed. The caller owns the look of both states. */
  armedClassName?: string;
  disabled?: boolean;
  title?: string;
  /** How long an armed button stays armed, in ms. */
  disarmAfter?: number;
}

export function ArmedButton({
  label,
  confirmLabel,
  onConfirm,
  className = '',
  armedClassName = '',
  disabled,
  title,
  disarmAfter = 4000,
}: ArmedButtonProps) {
  const [armed, setArmed] = useState(false);

  // The timeout is the safety, not a nicety. A button left armed on screen is a
  // one-tap destructive button by the time anybody touches it again, and nobody
  // remembers arming something a minute ago.
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), disarmAfter);
    return () => clearTimeout(id);
  }, [armed, disarmAfter]);

  // Going dead mid-arm disarms it. Otherwise a dropped socket parks the button
  // in its confirm state and it comes back live, one tap from firing.
  useEffect(() => {
    if (disabled) setArmed(false);
  }, [disabled]);

  return (
    <button
      type="button"
      className={armed && armedClassName ? `${className} ${armedClassName}` : className}
      disabled={disabled}
      title={title}
      onClick={() => {
        if (!armed) return setArmed(true);
        // Disarm before firing: `onConfirm` often unmounts this, and on the
        // paths where it doesn't, a button still reading "Really?" is a button
        // that looks like it didn't work.
        setArmed(false);
        onConfirm();
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
