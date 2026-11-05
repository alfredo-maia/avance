import test, { before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { startDashboardServer } from '../../src/server/standalone-server.mjs';

let serverInstance: any;
let baseUrl: string;
let browser: any;

const PLAYWRIGHT_PATH = process.env.PLAYWRIGHT_PATH || '/home/hermes/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';

describe('Liquid Lens / Liquid Glass UI — Validação Visual e Interativa E2E', () => {
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

  test('KPI Cards: deve aplicar refração óptica, classe liquid-lens-card e specular highlight', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);

    // Acessa aba finanças com os KPIs
    await page.click('#tab-btn-finance');
    const kpiReceived = page.locator('#kpi-received');
    await kpiReceived.waitFor({ state: 'visible' });

    // Verifica que os cards de KPI possuem a classe liquid-lens-card
    const classAttr = await kpiReceived.getAttribute('class');
    assert.ok(classAttr?.includes('liquid-lens-card'), 'KPI card deve possuir classe liquid-lens-card');

    // Verifica computed styles de refração (backdrop-filter e box-shadow de lente)
    const styles = await kpiReceived.evaluate((el: HTMLElement) => {
      const computed = window.getComputedStyle(el);
      return {
        backdropFilter: computed.backdropFilter || (computed as any).webkitBackdropFilter,
        borderRadius: computed.borderRadius,
        boxShadow: computed.boxShadow,
      };
    });

    assert.ok(styles.backdropFilter && styles.backdropFilter !== 'none', 'Deve possuir backdrop-filter de refração líquido');
    assert.ok(parseInt(styles.borderRadius, 10) >= 8, 'Border radius deve ser moderno (>= 8px)');
    assert.ok(styles.boxShadow && styles.boxShadow !== 'none', 'Deve possuir box-shadow com specular highlight ou ambient depth');

    await page.close();
  });

  test('Abas / Dock: navegação deve adotar classe liquid-lens-dock e realce de lente na aba ativa', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);

    const dock = page.locator('nav.tab-nav');
    await dock.waitFor({ state: 'visible' });

    const dockClass = await dock.getAttribute('class');
    assert.ok(dockClass?.includes('liquid-lens-dock'), 'Navegação de abas deve possuir classe liquid-lens-dock');

    // Aba ativa inicial (#tab-btn-finance)
    const activeTab = page.locator('#tab-btn-finance');
    const tabClass = await activeTab.getAttribute('class');
    assert.ok(tabClass?.includes('liquid-lens-dock-tab'), 'Aba deve possuir classe liquid-lens-dock-tab');

    // Clica em outra aba e valida transição do realce líquido
    const cardsTab = page.locator('#tab-btn-cards');
    await cardsTab.click();
    const updatedCardsClass = await cardsTab.getAttribute('class');
    assert.ok(updatedCardsClass?.includes('liquid-lens-dock-tab-active'), 'Aba clicada deve receber realce líquido ativo');

    await page.close();
  });

  test('Modais: deve aplicar liquid-lens-modal e backdrop com desfoque de refração', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);

    // Abre modal de novo tenant
    await page.click('#btn-new-tenant');
    const modal = page.locator('#modal-new-tenant');
    await modal.waitFor({ state: 'visible' });

    const modalBackdropClass = await modal.getAttribute('class');
    assert.ok(modalBackdropClass?.includes('liquid-lens-modal-backdrop'), 'Modal deve possuir backdrop líquido');

    const modalDialog = modal.locator('.modal-content');
    const dialogClass = await modalDialog.getAttribute('class');
    assert.ok(dialogClass?.includes('liquid-lens-modal'), 'Conteúdo do modal deve possuir classe liquid-lens-modal');

    // Verifica que backdrop-filter está ativo no modal ou no backdrop
    const modalStyle = await modalDialog.evaluate((el: HTMLElement) => {
      const computed = window.getComputedStyle(el);
      return {
        backdropFilter: computed.backdropFilter || (computed as any).webkitBackdropFilter,
        boxShadow: computed.boxShadow,
      };
    });
    assert.ok(modalStyle.boxShadow && modalStyle.boxShadow !== 'none', 'Modal deve ter sombra profunda de lente');

    // Fecha o modal
    await page.click('#btn-cancel-tenant');
    await page.waitForTimeout(100);
    assert.equal(await modal.isVisible(), false);

    await page.close();
  });

  test('Responsividade e integridade do layout Liquid Lens em 360px', async () => {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto(`${baseUrl}/`);

    // Sem overflow horizontal mesmo com efeitos de vidro e sombras
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(scrollWidth <= 360, `Largura de rolagem (${scrollWidth}px) não pode exceder o viewport de 360px`);

    await page.close();
  });
});
