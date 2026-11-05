/**
 * Liquid Lens / Liquid Glass UI — Design Tokens e Utilitários de Refração Óptica
 * Compatível com Next.js App Router e Standalone Server (ADR-0002)
 */

export const LIQUID_LENS_CLASSES = {
  base: 'liquid-lens',
  card: 'liquid-lens-card',
  dock: 'liquid-lens-dock',
  dockTab: 'liquid-lens-dock-tab',
  dockTabActive: 'liquid-lens-dock-tab-active',
  modal: 'liquid-lens-modal',
  modalBackdrop: 'liquid-lens-modal-backdrop',
  sheen: 'liquid-lens-sheen',
  badge: 'liquid-lens-badge',
} as const;

export const LIQUID_LENS_TOKENS = {
  refraction: {
    blur: '16px',
    saturate: '180%',
    contrast: '102%',
    specularHighlight: 'inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.75)',
    specularLowlight: 'inset 0 -1px 1px 0 rgba(0, 0, 0, 0.06)',
    lensRim: '1px solid rgba(255, 255, 255, 0.45)',
    lensShadow: '0 12px 32px -10px rgba(15, 23, 42, 0.12), 0 4px 12px -2px rgba(15, 23, 42, 0.06)',
    surfaceBg: 'rgba(255, 255, 255, 0.72)',
    surfaceSubtleBg: 'rgba(241, 245, 249, 0.65)',
  },
  dock: {
    blur: '20px',
    bg: 'rgba(255, 255, 255, 0.82)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    activeBg: 'rgba(37, 99, 235, 0.12)',
    activeBorder: '1px solid rgba(37, 99, 235, 0.35)',
    activeShadow: '0 4px 14px -2px rgba(37, 99, 235, 0.22), inset 0 1px 1px 0 rgba(255, 255, 255, 0.9)',
  },
  modal: {
    backdropBlur: '12px',
    backdropBg: 'rgba(15, 23, 42, 0.48)',
    dialogBg: 'rgba(255, 255, 255, 0.92)',
    dialogShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.35), inset 0 1px 2px 0 rgba(255, 255, 255, 0.8)',
  },
  variants: {
    default: {
      accent: '#2563eb',
      glow: 'rgba(37, 99, 235, 0.15)',
    },
    success: {
      accent: '#16a34a',
      glow: 'rgba(22, 163, 74, 0.16)',
    },
    warning: {
      accent: '#d97706',
      glow: 'rgba(217, 119, 6, 0.16)',
    },
    danger: {
      accent: '#dc2626',
      glow: 'rgba(220, 38, 38, 0.16)',
    },
  },
};

/**
 * Retorna classes CSS para um card Liquid Lens conforme variante
 */
export function getLiquidLensCardClass(variant?: 'default' | 'success' | 'warning' | 'danger'): string {
  const base = `${LIQUID_LENS_CLASSES.base} ${LIQUID_LENS_CLASSES.card}`;
  if (!variant || variant === 'default') {
    return base;
  }
  return `${base} liquid-lens-card--${variant}`;
}

/**
 * Retorna classe CSS para uma aba de dock Liquid Lens
 */
export function getLiquidDockTabClass(isActive: boolean): string {
  const base = LIQUID_LENS_CLASSES.dockTab;
  return isActive ? `${base} ${LIQUID_LENS_CLASSES.dockTabActive}` : base;
}

/**
 * Gera string de variáveis CSS com base nos tokens de refração
 */
export function generateRefractionCssVariables(): string {
  const { refraction, dock, modal } = LIQUID_LENS_TOKENS;
  return `
    --lens-blur: ${refraction.blur};
    --lens-saturate: ${refraction.saturate};
    --lens-contrast: ${refraction.contrast};
    --lens-specular: ${refraction.specularHighlight};
    --lens-rim: ${refraction.lensRim};
    --lens-shadow: ${refraction.lensShadow};
    --lens-surface: ${refraction.surfaceBg};
    --dock-blur: ${dock.blur};
    --dock-bg: ${dock.bg};
    --dock-active-bg: ${dock.activeBg};
    --dock-active-shadow: ${dock.activeShadow};
    --modal-backdrop-blur: ${modal.backdropBlur};
    --modal-backdrop-bg: ${modal.backdropBg};
    --modal-dialog-bg: ${modal.dialogBg};
    --modal-dialog-shadow: ${modal.dialogShadow};
  `.trim();
}

/**
 * Validador de contraste WCAG simplificado entre duas cores hex
 */
export function validateLiquidLensContrast(fgHex: string, bgHex: string): boolean {
  function getLuminance(hex: string): number {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;

    const [rs, gs, bs] = [r, g, b].map((c) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  const l1 = getLuminance(fgHex);
  const l2 = getLuminance(bgHex);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

  // Exige razão mínima de contraste de 3:1 (recomendado para elementos gráficos e texto largo)
  return ratio >= 3.0;
}
