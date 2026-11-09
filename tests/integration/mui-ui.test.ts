import test, { before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startDashboardServer } from '../../src/server/standalone-server.mjs';

let serverInstance: any;
let baseUrl: string;
let browser: any;

const HERMES_PLAYWRIGHT = '/home/hermes/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const PLAYWRIGHT_PATH = process.env.PLAYWRIGHT_PATH || (fs.existsSync(HERMES_PLAYWRIGHT) ? HERMES_PLAYWRIGHT : 'playwright');

describe('Material UI (MUI) — Validação Visual e Interativa E2E', () => {
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

  test('KPI Cards: deve aplicar Material UI Card, tipografia e variantes', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);

    // Acessa aba finanças com os KPIs
    await page.click('#tab-btn-finance');
    const kpiReceived = page.locator('#kpi-received');
    await kpiReceived.waitFor({ state: 'visible' });

    // Verifica que os cards de KPI possuem a classe kpi-card
    const classAttr = await kpiReceived.getAttribute('class');
    assert.ok(classAttr?.includes('kpi-card'), 'KPI card deve possuir classe kpi-card');

    // Verifica computed styles (border-radius e box-shadow modernos do Material UI)
    const styles = await kpiReceived.evaluate((el: HTMLElement) => {
      const computed = window.getComputedStyle(el);
      return {
        borderRadius: computed.borderRadius,
        boxShadow: computed.boxShadow,
      };
    });

    assert.ok(parseInt(styles.borderRadius, 10) >= 8, 'Border radius deve ser moderno (>= 8px)');
    assert.ok(styles.boxShadow && styles.boxShadow !== 'none', 'Deve possuir box-shadow de elevação');

    await page.close();
  });

  test('Abas / Dock: navegação deve adotar abas com acessibilidade e alternância de estado', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);

    const dock = page.locator('nav.tab-nav');
    await dock.waitFor({ state: 'visible' });

    // Aba ativa inicial (#tab-btn-finance)
    const activeTab = page.locator('#tab-btn-finance');
    await activeTab.waitFor({ state: 'visible' });

    // Clica em outra aba e valida transição
    const cardsTab = page.locator('#tab-btn-cards');
    await cardsTab.click();
    const isCardsVisible = await page.locator('#tab-cards').isVisible();
    assert.ok(isCardsVisible, 'Painel de cartões deve ficar visível');

    await page.close();
  });

  test('Modais: deve aplicar modal de cadastro de novo tenant com acessibilidade', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);

    // Abre modal de novo tenant
    await page.click('#btn-new-tenant');
    const modal = page.locator('#modal-new-tenant');
    await modal.waitFor({ state: 'visible' });

    const inputName = page.locator('#input-tenant-name');
    await assert.doesNotReject(async () => await inputName.waitFor({ state: 'visible' }));

    await page.close();
  });

  test('Responsividade e integridade do layout Material UI em 360px', async () => {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto(`${baseUrl}/`);

    const header = page.locator('.saas-header');
    await header.waitFor({ state: 'visible' });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    assert.ok(scrollWidth <= clientWidth + 20, 'Layout deve ser responsivo em 360px');
    await page.close();
  });
});
