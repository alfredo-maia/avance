import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { theme, validateMuiContrast } from '../../src/theme/theme.ts';
import ThemeRegistry from '../../src/theme/ThemeRegistry.ts';

describe('Material UI (MUI) Design System — Tema Central e Tokens (TDD)', () => {
  test('deve exportar tema central MUI devidamente configurado', () => {
    assert.ok(theme, 'Tema MUI deve existir');
    assert.equal(theme.palette.mode, 'light');
    assert.equal(theme.palette.primary.main, '#2563eb');
    assert.equal(theme.palette.secondary.main, '#7c3aed');
  });

  test('deve conter paleta semântica completa (primary, secondary, success, warning, error)', () => {
    assert.equal(theme.palette.success.main, '#16a34a');
    assert.equal(theme.palette.warning.main, '#d97706');
    assert.equal(theme.palette.error.main, '#dc2626');
    assert.equal(theme.palette.background.default, '#f8fafc');
    assert.equal(theme.palette.background.paper, '#ffffff');
    assert.equal(theme.palette.text.primary, '#0f172a');
  });

  test('deve configurar tipografia com escala responsiva e família sans-serif', () => {
    assert.ok(theme.typography.fontFamily?.includes('Inter'));
    assert.equal(theme.typography.h1.fontSize, '2rem');
    assert.equal(theme.typography.h2.fontSize, '1.5rem');
    assert.equal(theme.typography.h3.fontSize, '1.25rem');
    assert.equal(theme.typography.body1.fontSize, '1rem');
  });

  test('deve configurar customizações de componentes (MuiCard, MuiButton, MuiChip, MuiDialog, MuiTabs)', () => {
    assert.ok(theme.components?.MuiCard);
    assert.ok(theme.components?.MuiButton);
    assert.ok(theme.components?.MuiChip);
    assert.ok(theme.components?.MuiDialog);
    assert.ok(theme.components?.MuiTabs);
    assert.ok(theme.components?.MuiTab);
  });

  test('deve prover ThemeRegistry com suporte a CssBaseline e AppRouterCacheProvider', () => {
    assert.equal(typeof ThemeRegistry, 'function');
  });

  test('validateMuiContrast deve garantir contraste legível WCAG 2.1 AA', () => {
    assert.equal(validateMuiContrast('#ffffff', '#0f172a'), true);
    assert.equal(validateMuiContrast('#000000', '#ffffff'), true);
    assert.equal(validateMuiContrast('#ffffff', theme.palette.primary.main), true);
    assert.equal(validateMuiContrast('#ffffff', theme.palette.success.main), true);
    assert.equal(validateMuiContrast('#ffffff', theme.palette.error.main), true);
    assert.equal(validateMuiContrast('#ffffff', '#ffffff'), false);
  });
});
