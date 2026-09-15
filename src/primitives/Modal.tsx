import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  onClose: () => void;
  // Used only for the dialog's accessible name.
  title?: string;
  children: React.ReactNode;
}

// Centered modal dialog: a scaled-in box over a dimming overlay. Clicking the
// overlay (anywhere outside the box) closes it. Mirrors BottomSheet's
// mount/animation lifecycle so `open` can flip to false while it animates out.
export function Modal({ open, onClose, title, children }: Props) {
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(id);
    }
    setEntered(false);
    const id = window.setTimeout(() => setMounted(false), 250);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div className={`modal-overlay${entered ? ' open' : ''}`} onClick={onClose}>
      <div
        className={`modal-box${entered ? ' open' : ''}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
