import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  // When true the sheet is only as tall as its content (still capped at the
  // CSS max-height) instead of the default fixed height.
  fitContent?: boolean;
  // When true the content area drops its padding and scroll, so the consumer
  // can lay out its own fixed header + independently scrolling body.
  flush?: boolean;
  children: React.ReactNode;
}

const SWIPE_CLOSE_THRESHOLD = 100;

export function BottomSheet({ open, onClose, title, fitContent, flush, children }: Props) {
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragDelta = useRef(0);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(id);
    }
    setEntered(false);
    const id = window.setTimeout(() => setMounted(false), 300);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mounted]);

  if (!mounted) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragDelta.current = 0;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null || !sheetRef.current) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta <= 0) {
      sheetRef.current.style.transform = '';
      dragDelta.current = 0;
      return;
    }
    dragDelta.current = delta;
    sheetRef.current.style.transform = `translateX(-50%) translateY(${delta}px)`;
    sheetRef.current.style.transition = 'none';
  };

  const onTouchEnd = () => {
    if (!sheetRef.current) return;
    sheetRef.current.style.transform = '';
    sheetRef.current.style.transition = '';
    const shouldClose = dragDelta.current > SWIPE_CLOSE_THRESHOLD;
    dragStartY.current = null;
    dragDelta.current = 0;
    if (shouldClose) onClose();
  };

  return createPortal(
    <>
      <div
        className={`bottom-sheet-backdrop${entered ? ' open' : ''}`}
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className={`bottom-sheet${entered ? ' open' : ''}`}
        style={fitContent ? { height: 'auto' } : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div
          className="bottom-sheet-handle-area"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="bottom-sheet-handle" />
        </div>
        {title && (
          <div className="bottom-sheet-header">
            <div className="bottom-sheet-title">{title}</div>
          </div>
        )}
        <div className={`bottom-sheet-content${flush ? ' flush' : ''}`}>
          {children}
        </div>
      </div>
    </>,
    document.body,
  );
}
