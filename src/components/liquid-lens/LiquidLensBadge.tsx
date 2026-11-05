import React, { type ReactNode } from 'react';
import { LIQUID_LENS_CLASSES } from './tokens.ts';

export interface LiquidLensBadgeProps {
  id?: string;
  children: ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function LiquidLensBadge({
  id,
  children,
  variant = 'primary',
  className = '',
}: LiquidLensBadgeProps) {
  return (
    <span
      id={id}
      className={`${LIQUID_LENS_CLASSES.badge} badge badge-plan ${className}`.trim()}
    >
      {children}
    </span>
  );
}

export default LiquidLensBadge;
