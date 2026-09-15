import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  /** Hold the lock while this is true. */
  active: boolean;
  /** What is happening, in the present tense — "Starting your jam…". */
  title: string;
  /** Optional second line: why it's slow, or what not to do. */
  detail?: string;
}

// Marks a container as one of ours, so nested locks don't freeze each other.
const LOCK_ATTR = 'data-lock-screen';

/**
 * A full-screen "wait for this" overlay for an action that must not be
 * interrupted: a slow write, a wallet signature, anything irreversible in
 * flight. Renders nothing when `active` is false.
 *
 * It doesn't merely *cover* the app — it makes it **`inert`**. While the lock is
 * up every other top-level element (the app root, and any modal or sheet already
 * portalled next to it) has `inert` set, so nothing under it can be clicked,
 * tabbed to, focused, or read out. That's the part a z-indexed overlay alone
 * doesn't buy you: without it, Tab still reaches the button that started the
 * action and Enter fires it a second time.
 *
 * Body scroll is frozen alongside, so the page can't be moved under the lock.
 *
 * **This is the only thing the caller needs.** A component behind a lock doesn't
 * also have to disable its own buttons or neuter its dismiss handler — those
 * guards can't be reached. What it *should* still do is guard the action itself
 * against re-entry (`useCreateAlbum` holds an in-flight ref), because that
 * protects against the caller's own logic, not the user's fingers.
 *
 * Appears after a 150ms delay (see lock-screen.css). The lock takes hold
 * immediately; only the visuals wait, so an action that resolves quickly blocks
 * input without flashing an overlay.
 */
export function LockScreen({ active, title, detail }: Props) {
  // Our own container, not `document.body` directly: the effect has to be able
  // to tell the overlay apart from everything it's freezing, and a node we made
  // is the one reference that's certain.
  const [container] = useState(() => {
    const el = document.createElement('div');
    el.setAttribute(LOCK_ATTR, '');
    return el;
  });

  useEffect(() => {
    if (!active) return;

    document.body.appendChild(container);

    // Only elements this lock actually changed are restored — an element that
    // was already inert for its own reasons stays that way.
    const frozen = Array.from(document.body.children).filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement && !el.hasAttribute(LOCK_ATTR) && !el.inert,
    );
    frozen.forEach(el => {
      el.inert = true;
    });

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      frozen.forEach(el => {
        el.inert = false;
      });
      document.body.style.overflow = previousOverflow;
      container.remove();
    };
  }, [active, container]);

  if (!active) return null;

  return createPortal(
    <div className="lock-screen" role="alert" aria-busy="true" aria-live="assertive">
      <div className="spinner large processing" />
      <p className="lock-screen__title">{title}</p>
      {detail && <p className="lock-screen__detail">{detail}</p>}
    </div>,
    container,
  );
}
