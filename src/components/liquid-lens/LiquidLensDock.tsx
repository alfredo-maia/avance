import React, { type ReactNode, type KeyboardEvent } from 'react';
import { LIQUID_LENS_CLASSES, getLiquidDockTabClass } from './tokens.ts';

export interface DockTabItem {
  id: string;
  label: string;
  targetPanelId?: string;
  badge?: string;
}

export interface LiquidLensDockProps {
  id?: string;
  items: DockTabItem[];
  activeId: string;
  onTabChange: (id: string) => void;
  className?: string;
  ariaLabel?: string;
}

export function LiquidLensDock({
  id = 'liquid-dock',
  items,
  activeId,
  onTabChange,
  className = '',
  ariaLabel = 'Navegação de Módulos',
}: LiquidLensDockProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % items.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + items.length) % items.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = items.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    const nextItem = items[nextIndex];
    if (nextItem) {
      onTabChange(nextItem.id);
      const nextBtn = document.getElementById(nextItem.id);
      nextBtn?.focus();
    }
  };

  return (
    <nav
      id={id}
      className={`${LIQUID_LENS_CLASSES.dock} tab-nav ${className}`.trim()}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item, idx) => {
        const isActive = item.id === activeId;
        const tabClass = `${getLiquidDockTabClass(isActive)} tab-btn`.trim();

        return (
          <button
            key={item.id}
            id={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={item.targetPanelId}
            tabIndex={isActive ? 0 : -1}
            className={tabClass}
            onClick={() => onTabChange(item.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
          >
            {item.label}
            {item.badge && <span className="tab-badge">{item.badge}</span>}
          </button>
        );
      })}
    </nav>
  );
}

export default LiquidLensDock;
