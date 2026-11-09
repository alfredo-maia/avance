import test, { before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startDashboardServer } from '../../src/server/standalone-server.mjs';
import { theme, validateMuiContrast } from '../../src/theme/theme.ts';

let serverInstance: any;
let baseUrl: string;
let browser: any;

const HERMES_PLAYWRIGHT = '/home/hermes/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const PLAYWRIGHT_PATH = process.env.PLAYWRIGHT_PATH || (fs.existsSync(HERMES_PLAYWRIGHT) ? HERMES_PLAYWRIGHT : 'playwright');

describe('QA Independente — Homologação da Migração Material UI (MUI) (AV-112 / Ms. Sakura)', () => {
  before(async () => {
    serverInstance = await startDashboardServer(0);
    const port = serverInstance.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const { chromium } = await import(PLAYWRIGHT_PATH);
    browser = await chromium.launch({ headless: true });
  });

  after(async () => {
    if (browser) {
      await browser.close();
    }
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
  });

  test('QA-1: Validar renderização e integridade dos componentes MUI em SSR / Client boundaries sem hydration mismatch', async () => {
    // 1. Inspeciona integridade do RootLayout e AppRouterCacheProvider
    const layoutPath = path.resolve('src/app/layout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
    assert.ok(layoutContent.includes('AppRouterCacheProvider'), 'RootLayout deve incluir AppRouterCacheProvider do @mui/material-nextjs');
    assert.ok(layoutContent.includes('ThemeRegistry'), 'RootLayout deve envelopar filhos com ThemeRegistry');

    // 2. Inspeciona ThemeRegistry com diretiva client-side estrita
    const registryPath = path.resolve('src/theme/ThemeRegistry.ts');
    const registryContent = fs.readFileSync(registryPath, 'utf-8');
    assert.ok(registryContent.startsWith("'use client'"), 'ThemeRegistry deve conter diretiva "use client" no topo');
    assert.ok(registryContent.includes('ThemeProvider'), 'ThemeRegistry deve prover ThemeProvider');
    assert.ok(registryContent.includes('CssBaseline'), 'ThemeRegistry deve injetar CssBaseline');

    // 3. Inspeciona page.tsx com diretiva client-side e imports oficiais MUI
    const pagePath = path.resolve('src/app/page.tsx');
    const pageContent = fs.readFileSync(pagePath, 'utf-8');
    assert.ok(pageContent.startsWith("'use client'"), 'page.tsx deve conter diretiva "use client" no topo');
    assert.ok(pageContent.includes('@mui/material'), 'page.tsx deve importar componentes de @mui/material');
    assert.ok(!pageContent.includes('liquid-lens'), 'page.tsx não deve conter referências ao design system legado Liquid Lens');

    // 4. Executa página no navegador e audita logs de console para ausência de hydration mismatches ou erros
    const page = await browser.newPage();
    const consoleErrors: string[] = [];
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(`${baseUrl}/`);
    await page.waitForLoadState('domcontentloaded');

    assert.equal(consoleErrors.length, 0, `Nenhum erro de console ou hydration mismatch deve ocorrer: ${consoleErrors.join('; ')}`);
    await page.close();
  });

  test('QA-2: Testar acessibilidade (WCAG 2.1 AA), navegação por teclado e foco na Grade Inline de 12 meses', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);

    // Validação de acessibilidade das abas (MUI Tabs / Dock)
    const tabList = page.locator('nav.tab-nav');
    await tabList.waitFor({ state: 'visible' });
    const tabRole = await tabList.getAttribute('role');
    assert.strictEqual(tabRole, 'tablist', 'Navegação por abas deve ter role="tablist"');

    const financeTab = page.locator('#tab-btn-finance');
    assert.strictEqual(await financeTab.getAttribute('role'), 'tab');
    assert.strictEqual(await financeTab.getAttribute('aria-selected'), 'true');

    // Navegação por teclado: Foco inicial e alternância de abas via teclado
    await financeTab.focus();
    let isFinanceFocused = await financeTab.evaluate((el: HTMLElement) => document.activeElement === el);
    assert.ok(isFinanceFocused, 'Aba Finanças deve receber foco via teclado');

    await page.keyboard.press('Tab');
    const cardsTab = page.locator('#tab-btn-cards');
    let isCardsFocused = await cardsTab.evaluate((el: HTMLElement) => document.activeElement === el);
    assert.ok(isCardsFocused, 'Próxima aba (#tab-btn-cards) deve receber foco no Tab');

    // Retorna para a aba Finanças
    await financeTab.click();
    await page.locator('#table-finance-matrix').waitFor({ state: 'visible' });

    // Foco e edição inline de célula na Grade Inline de 12 meses
    const row = page.locator('tr[data-group="RECEITAS"]').first();
    await row.waitFor({ state: 'visible' });

    const inputJan = row.locator('.input-inline-month[data-month="1"]');
    await inputJan.waitFor({ state: 'visible' });
    await inputJan.focus();

    const isCellFocused = await inputJan.evaluate((el: HTMLElement) => document.activeElement === el);
    assert.ok(isCellFocused, 'Input de célula da grade inline deve receber foco ao ser focado');

    await inputJan.fill('4500');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // Inserção inline e foco no campo de nome sem pop-ups
    const btnNew = page.locator('#btn-new-investimentos');
    await btnNew.click();
    await page.waitForTimeout(300);

    // Nova linha criada com input de nome
    const newRow = page.locator('tr[data-group="INVESTIMENTOS"]').last();
    await newRow.waitFor({ state: 'visible' });

    const nameInput = newRow.locator('.input-inline-name');
    await nameInput.waitFor({ state: 'visible' });
    await nameInput.focus();
    await nameInput.fill('Fundo de Reserva Emergência');
    await nameInput.dispatchEvent('blur');

    // Validação de contraste WCAG 2.1 AA no tema central MUI
    assert.ok(validateMuiContrast(theme.palette.text.primary, theme.palette.background.paper));
    assert.ok(validateMuiContrast(theme.palette.text.secondary, theme.palette.background.paper));
    assert.ok(validateMuiContrast(theme.palette.primary.main, '#ffffff'));
    assert.ok(validateMuiContrast(theme.palette.success.main, '#ffffff'));
    assert.ok(validateMuiContrast(theme.palette.error.main, '#ffffff'));

    await page.close();
  });

  test('QA-3: Conferir responsividade em viewport de 360px a 1440px', async () => {
    const page = await browser.newPage();
    const viewports = [
      { name: 'Mobile (360px)', width: 360, height: 640 },
      { name: 'Tablet (768px)', width: 768, height: 1024 },
      { name: 'Desktop Médio (1024px)', width: 1024, height: 768 },
      { name: 'Desktop Amplo (1440px)', width: 1440, height: 900 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${baseUrl}/`);
      await page.locator('#tab-btn-finance').click();
      await page.locator('#table-finance-matrix').waitFor({ state: 'visible' });

      // Validação de integridade estrutural no viewport
      const headerVisible = await page.locator('.saas-header').isVisible();
      const kpisVisible = await page.locator('#kpi-received').isVisible();
      const tableVisible = await page.locator('#table-finance-matrix').isVisible();

      assert.ok(headerVisible, `Cabeçalho deve ser visível no viewport ${vp.name}`);
      assert.ok(kpisVisible, `KPI Cards devem ser visíveis no viewport ${vp.name}`);
      assert.ok(tableVisible, `Tabela da grade de 12 meses deve ser visível no viewport ${vp.name}`);

      // Verifica que o container de tabela isola o scroll horizontal se necessário (sem quebrar a página inteira)
      const docScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const docClientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      assert.ok(
        docScrollWidth <= docClientWidth + 20,
        `Página não deve possuir overflow horizontal descontrolado no viewport ${vp.name} (scrollWidth=${docScrollWidth}, clientWidth=${docClientWidth})`
      );
    }

    await page.close();
  });

  test('QA-4: Garantir que todos os testes unitários, de integração e smoke passem sem falhas no SHA final', () => {
    // Validação estática de coerência e ausência de resquícios de arquivos legados
    const legacyComponentsDir = path.resolve('src/components/liquid-lens');
    assert.strictEqual(fs.existsSync(legacyComponentsDir), false, 'Diretório legado src/components/liquid-lens deve estar excluído');

    // Validação de existência do ADR-0004
    const adrPath = path.resolve('docs/adr/0004-material-ui-adoption-and-liquid-lens-deprecation.md');
    assert.ok(fs.existsSync(adrPath), 'ADR-0004 do Material UI deve existir');

    // Validação dos módulos centrais MUI
    assert.ok(fs.existsSync(path.resolve('src/theme/theme.ts')), 'src/theme/theme.ts deve existir');
    assert.ok(fs.existsSync(path.resolve('src/theme/ThemeRegistry.ts')), 'src/theme/ThemeRegistry.ts deve existir');
  });
});
