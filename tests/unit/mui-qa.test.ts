import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { theme, validateMuiContrast } from '../../src/theme/theme.ts';

describe('QA Independente — Material UI Design System & Acessibilidade (Ms. Sakura)', () => {
  test('QA-1: Integridade da paleta corporativa e elevações do Material UI', () => {
    assert.strictEqual(theme.palette.primary.main, '#2563eb');
    assert.strictEqual(theme.palette.background.default, '#f8fafc');
    assert.strictEqual(theme.palette.background.paper, '#ffffff');
    assert.strictEqual(theme.shape.borderRadius, 8);
    assert.ok(theme.components?.MuiCard?.styleOverrides?.root);
  });

  test('QA-2: Matriz de variantes e contrastes de cores de status (success, warning, error)', () => {
    assert.strictEqual(theme.palette.success.main, '#16a34a');
    assert.strictEqual(theme.palette.warning.main, '#d97706');
    assert.strictEqual(theme.palette.error.main, '#dc2626');

    // Valida contraste das cores de status sobre o fundo branco dos cards
    assert.strictEqual(validateMuiContrast(theme.palette.success.main, '#ffffff'), true);
    assert.strictEqual(validateMuiContrast(theme.palette.warning.main, '#ffffff'), true);
    assert.strictEqual(validateMuiContrast(theme.palette.error.main, '#ffffff'), true);
  });

  test('QA-3: Comportamento e acessibilidade das Tabs e TabIndicator', () => {
    const tabsStyle = theme.components?.MuiTabs?.styleOverrides?.indicator as any;
    assert.strictEqual(tabsStyle?.height, 3);
    assert.strictEqual(tabsStyle?.borderRadius, 3);

    const tabStyle = theme.components?.MuiTab?.styleOverrides?.root as any;
    assert.strictEqual(tabStyle?.textTransform, 'none');
    assert.strictEqual(tabStyle?.fontWeight, 600);
  });

  test('QA-4: Contraste WCAG 2.1 AA em superfícies e variantes de status MUI', () => {
    // Texto primário (#0f172a) e secundário (#475569) sobre papel branco (#ffffff)
    assert.strictEqual(validateMuiContrast(theme.palette.text.primary, '#ffffff'), true);
    assert.strictEqual(validateMuiContrast(theme.palette.text.secondary, '#ffffff'), true);

    // Cores primárias
    assert.strictEqual(validateMuiContrast(theme.palette.primary.main, '#ffffff'), true);
    assert.strictEqual(validateMuiContrast(theme.palette.primary.contrastText, theme.palette.primary.main), true);

    // Cores idênticas devem falhar no contraste
    assert.strictEqual(validateMuiContrast('#ffffff', '#ffffff'), false);
    assert.strictEqual(validateMuiContrast('#000000', '#000000'), false);
  });

  test('QA-5: Conformidade de tipografia e CssBaseline centralizado', () => {
    assert.ok(theme.typography.fontFamily?.includes('Inter'));
    assert.strictEqual(theme.typography.h1.fontWeight, 700);
    assert.strictEqual(theme.typography.h2.fontWeight, 600);
    assert.strictEqual(theme.typography.body1.fontSize, '1rem');
    assert.strictEqual(theme.palette.mode, 'light');
  });
});
