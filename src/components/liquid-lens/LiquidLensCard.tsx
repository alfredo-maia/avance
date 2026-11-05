import React, { type ReactNode } from 'react';
import { getLiquidLensCardClass } from './tokens.ts';

export interface LiquidLensCardProps {
  id?: string;
  title?: string;
  value?: string | number;
  trend?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
  children?: ReactNode;
  ariaLabel?: string;
}

export function LiquidLensCard({
  id,
  title,
  value,
  trend,
  variant = 'default',
  className = '',
  children,
  ariaLabel,
}: LiquidLensCardProps) {
  const cardClass = `${getLiquidLensCardClass(variant)} ${className}`.trim();

  return (
    <article id={id} className={cardClass} aria-label={ariaLabel || title} tabIndex={0}>
      {title && <div className="kpi-label">{title}</div>}
      {value !== undefined && (
        <div className={`kpi-value ${variant !== 'default' ? variant : ''}`}>{value}</div>
      )}
      {trend && <div className="kpi-trend">{trend}</div>}
      {children}
    </article>
  );
}

export default LiquidLensCard;
