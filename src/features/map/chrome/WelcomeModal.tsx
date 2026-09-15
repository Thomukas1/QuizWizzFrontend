import { useState, useEffect } from 'react';

const WELCOMED_KEY = 'slopbop_welcomed';

export function useWelcomeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(WELCOMED_KEY)) {
      setOpen(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(WELCOMED_KEY, '1');
    setOpen(false);
  };

  const reopen = () => setOpen(true);

  return { open, dismiss, reopen };
}

interface WelcomeModalProps {
  open: boolean;
  onDismiss: () => void;
}

export function WelcomeModal({ open, onDismiss }: WelcomeModalProps) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-modal bg-black/70 backdrop-blur-sm" onClick={onDismiss} />
      <div className="fixed inset-x-0 top-1/2 -translate-y-1/2 z-modal mx-auto w-[min(380px,calc(100vw-32px))]">
        <div className="rounded-xl border border-white/15 bg-surface p-xl flex flex-col items-center gap-md shadow-xl">
          <img src="/Branding/logo.png" alt="SlopBop" className="w-24 h-24 object-contain" />
          <div className="flex flex-col gap-lg text-center">
            <p className="text-sm leading-relaxed">
              Synthetic singers are invited to <span className="highlight">SlopBop Residency</span> program to experience the local culture, get inspired and create songs for the whole world to listen and enjoy.
            </p>
            <p className="text-sm text-muted leading-relaxed">
              Tap on locations or artists on the map to see what they're up to now!
            </p>
          </div>
          <button type="button" className="primary w-full" onClick={onDismiss}>
            Got It
          </button>
        </div>
      </div>
    </>
  );
}
