import React, { type ReactNode, useEffect } from 'react';
import { LIQUID_LENS_CLASSES } from './tokens.ts';

export interface LiquidLensModalProps {
  id?: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function LiquidLensModal({
  id = 'liquid-modal',
  isOpen,
  onClose,
  title,
  children,
  className = '',
}: LiquidLensModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id={id}
      className={`${LIQUID_LENS_CLASSES.modalBackdrop} modal open`}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`${LIQUID_LENS_CLASSES.modal} modal-content ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
      >
        <div className="section-header">
          <h2 id={`${id}-title`} className="modal-title">
            {title}
          </h2>
          <button
            type="button"
            className="btn-secondary"
            aria-label="Fechar modal"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export default LiquidLensModal;
