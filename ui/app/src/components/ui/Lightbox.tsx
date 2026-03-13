import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface LightboxProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
}

export function Lightbox({ open, onClose, children, ariaLabel }: LightboxProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !open) {
      return;
    }
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mounted, open]);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4 py-10"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? 'Lightbox dialog'}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute z-10 right-5 top-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="bg-black text-white">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
