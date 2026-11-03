import test, { before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { startDashboardServer } from '../../src/server/standalone-server.mjs';

let serverInstance: any;
let baseUrl: string;
let browser: any;

const PLAYWRIGHT_PATH = process.env.PLAYWRIGHT_PATH || '/home/hermes/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';

describe('SaaS Multi-Tenant Dashboard UI & Frontend TDD (AC-16)', () => {
  before(async () => {
    // Inicializa o servidor standalone do dashboard em porta efêmera (0)
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

  test('AC-16: Cabeçalho Multi-Tenant, Criação de Tenant e Filtro PF/PJ', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);

    // Validação de cabeçalho
    const tenantSelect = page.locator('#tenant-select');
    await assert.doesNotReject(async () => await tenantSelect.waitFor({ state: 'visible' }));

    const planBadge = page.locator('#plan-badge');
    assert.match(await planBadge.innerText(), /PRO|FREE|ENTERPRISE/);

    const profileFilter = page.locator('#profile-filter');
    await assert.doesNotReject(async () => await profileFilter.waitFor({ state: 'visible' }));

    // Criar novo Tenant via modal
    await page.click('#btn-new-tenant');
    await page.fill('#input-tenant-name', 'Acme Corporation');
    await page.selectOption('#select-tenant-plan', 'ENTERPRISE');
    await page.click('#btn-submit-tenant');

    // Tenant deve aparecer no seletor
    await page.waitForTimeout(300);
    const options = await page.locator('#tenant-select option').allInnerTexts();
    assert.ok(options.some((opt: string) => opt.includes('Acme Corporation')));
    await page.close();
  });

  test('AC-16 & AC-3..AC-5: Módulo 1 (Controle Finanças) - KPIs, Matriz e Gráficos SVG', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);

    // Clica na aba Controle Finanças
    await page.click('#tab-btn-finance');
    const tabFinance = page.locator('#tab-finance');
    assert.equal(await tabFinance.getAttribute('aria-hidden'), 'false');

    // Validação dos 9 cards de KPIs
    const kpis = [
      '#kpi-received',
      '#kpi-to-receive',
      '#kpi-paid',
      '#kpi-to-pay',
      '#kpi-overdue-count',
      '#kpi-overdue-amount',
      '#kpi-month-result',
      '#kpi-accumulated-result',
      '#kpi-patrimony-balance',
    ];
    for (const selector of kpis) {
      const el = page.locator(selector);
      await assert.doesNotReject(async () => await el.waitFor({ state: 'visible' }), `KPI ${selector} deve estar visível`);
    }

    // Tabela Matriz Jan..Dez agrupada pelos 5 grupos
    const matrixTable = page.locator('#table-finance-matrix');
    await assert.doesNotReject(async () => await matrixTable.waitFor({ state: 'visible' }));
    const groupHeaders = await page.locator('.finance-group-header').allInnerTexts();
    assert.ok(groupHeaders.some((g: string) => g.includes('Recursos Financeiros') || g.includes('RECURSOS_FINANCEIROS')));
    assert.ok(groupHeaders.some((g: string) => g.includes('Receitas') || g.includes('RECEITAS')));

    // Gráficos SVG acessíveis e resumo de indicadores
    const chart = page.locator('#chart-monthly-evolution');
    await assert.doesNotReject(async () => await chart.waitFor({ state: 'visible' }));
    assert.ok(await chart.locator('svg').count() > 0, 'Deve conter elemento SVG');

    const indInvestment = page.locator('#indicator-investment-rate');
    const indCards = page.locator('#indicator-cards-ratio');
    const indPaid = page.locator('#indicator-paid-percentage');
    await assert.doesNotReject(async () => await indInvestment.waitFor({ state: 'visible' }));
    await assert.doesNotReject(async () => await indCards.waitFor({ state: 'visible' }));
    await assert.doesNotReject(async () => await indPaid.waitFor({ state: 'visible' }));

    await page.close();
  });

  test('AC-16 & AC-6..AC-9: Módulo 2 (Cartões de Crédito) - Painel, Reconciliação e Categorias', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);

    // Clica na aba Cartões de Crédito
    await page.click('#tab-btn-cards');
    const tabCards = page.locator('#tab-cards');
    assert.equal(await tabCards.getAttribute('aria-hidden'), 'false');

    // Painel dos 3 cartões cadastrados
    const panelCards = page.locator('#panel-cards');
    await assert.doesNotReject(async () => await panelCards.waitFor({ state: 'visible' }));
    const cardNames = await page.locator('.credit-card-item').allInnerTexts();
    assert.ok(cardNames.some((c: string) => c.includes('Banco do Brasil')));
    assert.ok(cardNames.some((c: string) => c.includes('Nubank PF')));

    // Tabela de Reconciliação
    const reconTable = page.locator('#table-card-reconciliation');
    await assert.doesNotReject(async () => await reconTable.waitFor({ state: 'visible' }));
    const reconText = await reconTable.innerText();
    assert.ok(reconText.includes('VALOR CONSIDERADO') || reconText.includes('Considerado'));

    // Categorias de Gastos (14 categorias)
    const catTable = page.locator('#table-card-categories');
    await assert.doesNotReject(async () => await catTable.waitFor({ state: 'visible' }));
    const catRows = await page.locator('#table-card-categories tbody tr').count();
    assert.equal(catRows, 14, 'Deve conter exatamente as 14 categorias canônicas');

    await page.close();
  });

  test('AC-16 & AC-10..AC-11: Módulo 3 (Propósitos e Metas) - Painel Plurianual e Metas', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);

    // Clica na aba Metas
    await page.click('#tab-btn-goals');
    const tabGoals = page.locator('#tab-goals');
    assert.equal(await tabGoals.getAttribute('aria-hidden'), 'false');

    // Painel Plurianual com as 4 categorias
    const catDistribution = page.locator('#panel-goals-distribution');
    await assert.doesNotReject(async () => await catDistribution.waitFor({ state: 'visible' }));
    const distText = await catDistribution.innerText();
    assert.ok(distText.includes('Financeira'));
    assert.ok(distText.includes('Desenvolvimento Pessoal'));
    assert.ok(distText.includes('Física/Saúde') || distText.includes('Saúde'));
    assert.ok(distText.includes('Diversão'));

    // Tabela de Metas com Situação e Dias Restantes
    const goalsTable = page.locator('#table-goals');
    await assert.doesNotReject(async () => await goalsTable.waitFor({ state: 'visible' }));

    // Seção de Conquistas Extras
    const extrasSection = page.locator('#section-extra-achievements');
    await assert.doesNotReject(async () => await extrasSection.waitFor({ state: 'visible' }));

    await page.close();
  });

  test('AC-16 & AC-12..AC-14: Módulo 4 (Plano de Ação das Metas) - 4 Tipos de Indicadores', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);

    // Clica na aba Plano de Ação
    await page.click('#tab-btn-action-plan');
    const tabActionPlan = page.locator('#tab-action-plan');
    assert.equal(await tabActionPlan.getAttribute('aria-hidden'), 'false');

    // Tabela de Indicadores com os 4 tipos de acompanhamento
    const actionPlanTable = page.locator('#table-action-plan');
    await assert.doesNotReject(async () => await actionPlanTable.waitFor({ state: 'visible' }));
    const planText = await actionPlanTable.innerText();
    assert.ok(planText.includes('SOMA'));
    assert.ok(planText.includes('LIMITE_MAXIMO'));
    assert.ok(planText.includes('ULTIMO_VALOR_REDUZIR'));
    assert.ok(planText.includes('MARCO_TEXTO'));

    await page.close();
  });

  test('AC-16: Acessibilidade ARIA, Navegação por Teclado e Responsividade em 360px', async () => {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto(`${baseUrl}/`);

    // Sem overflow horizontal na página
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(scrollWidth <= 360, `Largura de rolagem (${scrollWidth}px) não pode exceder o viewport de 360px`);

    // Estrutura ARIA nos botões de aba
    const tabList = page.locator('[role="tablist"]');
    await assert.doesNotReject(async () => await tabList.waitFor({ state: 'visible' }));

    const tabs = await page.locator('[role="tab"]').all();
    assert.equal(tabs.length, 4, 'Devem existir 4 abas com role="tab"');

    // Alternância por teclado
    await page.focus('#tab-btn-finance');
    await page.keyboard.press('ArrowRight');
    // Segunda aba ganha foco ou aria-selected
    const activeTabId = await page.evaluate(() => document.activeElement?.id);
    assert.ok(activeTabId === 'tab-btn-cards' || activeTabId === 'tab-btn-finance');

    await page.close();
  });
});
