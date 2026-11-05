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

describe('Liquid Lens Design System — Tokens e Utilitários (TDD)', () => {
  test('deve exportar classes canônicas do Liquid Lens', () => {
    assert.equal(LIQUID_LENS_CLASSES.base, 'liquid-lens');
    assert.equal(LIQUID_LENS_CLASSES.card, 'liquid-lens-card');
    assert.equal(LIQUID_LENS_CLASSES.dock, 'liquid-lens-dock');
    assert.equal(LIQUID_LENS_CLASSES.dockTab, 'liquid-lens-dock-tab');
    assert.equal(LIQUID_LENS_CLASSES.dockTabActive, 'liquid-lens-dock-tab-active');
    assert.equal(LIQUID_LENS_CLASSES.modal, 'liquid-lens-modal');
    assert.equal(LIQUID_LENS_CLASSES.modalBackdrop, 'liquid-lens-modal-backdrop');
    assert.equal(LIQUID_LENS_CLASSES.sheen, 'liquid-lens-sheen');
    assert.equal(LIQUID_LENS_CLASSES.badge, 'liquid-lens-badge');
  });

  test('deve conter tokens de refração óptica, specular highlight e profundidade', () => {
    assert.ok(LIQUID_LENS_TOKENS.refraction.blur.includes('px'));
    assert.ok(LIQUID_LENS_TOKENS.refraction.saturate.includes('%'));
    assert.ok(LIQUID_LENS_TOKENS.refraction.specularHighlight.includes('inset'));
    assert.ok(LIQUID_LENS_TOKENS.refraction.lensRim.includes('rgba'));
    assert.ok(LIQUID_LENS_TOKENS.refraction.lensShadow.includes('rgba'));
  });

  test('getLiquidLensCardClass deve gerar classes apropriadas por variante', () => {
    const defaultCard = getLiquidLensCardClass();
    assert.ok(defaultCard.includes('liquid-lens-card'));

    const successCard = getLiquidLensCardClass('success');
    assert.ok(successCard.includes('liquid-lens-card'));
    assert.ok(successCard.includes('liquid-lens-card--success'));

    const warningCard = getLiquidLensCardClass('warning');
    assert.ok(warningCard.includes('liquid-lens-card--warning'));

    const dangerCard = getLiquidLensCardClass('danger');
    assert.ok(dangerCard.includes('liquid-lens-card--danger'));
  });

  test('getLiquidDockTabClass deve alternar classe ativa', () => {
    const inactiveTab = getLiquidDockTabClass(false);
    assert.ok(inactiveTab.includes('liquid-lens-dock-tab'));
    assert.ok(!inactiveTab.includes('liquid-lens-dock-tab-active'));

    const activeTab = getLiquidDockTabClass(true);
    assert.ok(activeTab.includes('liquid-lens-dock-tab'));
    assert.ok(activeTab.includes('liquid-lens-dock-tab-active'));
  });

  test('generateRefractionCssVariables deve produzir variáveis CSS válidas', () => {
    const cssVars = generateRefractionCssVariables();
    assert.ok(cssVars.includes('--lens-blur:'));
    assert.ok(cssVars.includes('--lens-saturate:'));
    assert.ok(cssVars.includes('--lens-specular:'));
    assert.ok(cssVars.includes('--lens-rim:'));
    assert.ok(cssVars.includes('--lens-shadow:'));
  });

  test('validateLiquidLensContrast deve garantir contraste legível das cores de texto sobre vidro', () => {
    assert.equal(validateLiquidLensContrast('#ffffff', '#0f172a'), true);
    assert.equal(validateLiquidLensContrast('#000000', '#ffffff'), true);
    assert.equal(validateLiquidLensContrast('#ffffff', '#ffffff'), false);
  });
});
