import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  LIQUID_LENS_CLASSES,
  LIQUID_LENS_TOKENS,
  getLiquidLensCardClass,
  getLiquidDockTabClass,
  generateRefractionCssVariables,
  validateLiquidLensContrast,
} from '../../src/components/liquid-lens/tokens.ts';

describe('QA Independente — Liquid Lens Design System & Acessibilidade (Ms. Sakura)', () => {
  test('QA-1: Integridade dos tokens de refração óptica e elevação', () => {
    assert.strictEqual(LIQUID_LENS_TOKENS.refraction.blur, '16px');
    assert.strictEqual(LIQUID_LENS_TOKENS.dock.blur, '20px');
    assert.strictEqual(LIQUID_LENS_TOKENS.modal.backdropBlur, '12px');
    assert.ok(LIQUID_LENS_TOKENS.refraction.specularHighlight.startsWith('inset'));
  });

  test('QA-2: Matriz de variantes de cards (default, success, warning, danger)', () => {
    const variants: Array<'default' | 'success' | 'warning' | 'danger'> = ['default', 'success', 'warning', 'danger'];
    for (const v of variants) {
      const cls = getLiquidLensCardClass(v);
      assert.ok(cls.includes('liquid-lens'), `Variante ${v} deve incluir 'liquid-lens'`);
      assert.ok(cls.includes('liquid-lens-card'), `Variante ${v} deve incluir 'liquid-lens-card'`);
      if (v !== 'default') {
        assert.ok(cls.includes(`liquid-lens-card--${v}`), `Variante ${v} deve incluir sufixo de modificador`);
      }
    }
  });

  test('QA-3: Comportamento das abas do Dock com alternância de estado', () => {
    const active = getLiquidDockTabClass(true);
    const inactive = getLiquidDockTabClass(false);

    assert.ok(active.includes('liquid-lens-dock-tab-active'));
    assert.ok(!inactive.includes('liquid-lens-dock-tab-active'));
    assert.ok(inactive.includes('liquid-lens-dock-tab'));
  });

  test('QA-4: Contraste WCAG 2.1 AA em superfícies e variantes de status', () => {
    // Texto escuro padrão (#0f172a / #1e293b) sobre vidro branco translúcido (#ffffff)
    assert.strictEqual(validateLiquidLensContrast('#0f172a', '#ffffff'), true);
    assert.strictEqual(validateLiquidLensContrast('#1e293b', '#ffffff'), true);

    // Variantes de acento
    assert.strictEqual(validateLiquidLensContrast(LIQUID_LENS_TOKENS.variants.default.accent, '#ffffff'), true);
    assert.strictEqual(validateLiquidLensContrast(LIQUID_LENS_TOKENS.variants.success.accent, '#ffffff'), true);
    assert.strictEqual(validateLiquidLensContrast(LIQUID_LENS_TOKENS.variants.danger.accent, '#ffffff'), true);

    // Cores idênticas devem falhar no contraste
    assert.strictEqual(validateLiquidLensContrast('#ffffff', '#ffffff'), false);
    assert.strictEqual(validateLiquidLensContrast('#000000', '#000000'), false);
  });

  test('QA-5: Geração consistente de variáveis CSS de refração', () => {
    const cssVars = generateRefractionCssVariables();
    const expectedVars = [
      '--lens-blur:',
      '--lens-saturate:',
      '--lens-contrast:',
      '--lens-specular:',
      '--lens-rim:',
      '--lens-shadow:',
      '--lens-surface:',
      '--dock-blur:',
      '--dock-bg:',
      '--dock-active-bg:',
      '--dock-active-shadow:',
      '--modal-backdrop-blur:',
      '--modal-backdrop-bg:',
      '--modal-dialog-bg:',
      '--modal-dialog-shadow:',
    ];

    for (const v of expectedVars) {
      assert.ok(cssVars.includes(v), `Variáveis CSS geradas devem conter ${v}`);
    }
  });
});
