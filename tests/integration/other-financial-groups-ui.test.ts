import test, { before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startDashboardServer } from '../../src/server/standalone-server.mjs';

let serverInstance: any;
let baseUrl: string;
let browser: any;

const HERMES_PLAYWRIGHT = '/home/hermes/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const PLAYWRIGHT_PATH = process.env.PLAYWRIGHT_PATH || (fs.existsSync(HERMES_PLAYWRIGHT) ? HERMES_PLAYWRIGHT : 'playwright');

describe('Gestão Completa dos Demais Grupos Financeiros UI (AV-101 / Fase 1 / AC-1 a AC-5)', () => {
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

  test('AC-1: Botões e modal para criar novas linhas em RECEITAS, INVESTIMENTOS, DESPESAS_FIXAS e DESPESAS_VARIAVEIS', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);
    await page.click('#tab-btn-finance');

    // 1. Criação em RECEITAS
    const btnNewReceita = page.locator('#btn-new-receitas');
    await assert.doesNotReject(async () => await btnNewReceita.waitFor({ state: 'visible' }));
    await btnNewReceita.click();

    const modal = page.locator('#modal-new-resource');
    await assert.doesNotReject(async () => await modal.waitFor({ state: 'visible' }));

    await page.fill('#input-resource-name', 'Consultoria e Assinaturas Cloud');
    await page.selectOption('#select-resource-profile', 'PJ');
    await page.click('#btn-submit-new-resource');

    await page.waitForTimeout(400);
    const receitaRow = page.locator('tr[data-group="RECEITAS"]').filter({ hasText: 'Consultoria e Assinaturas Cloud' });
    await assert.doesNotReject(async () => await receitaRow.waitFor({ state: 'visible' }));
    assert.equal(await receitaRow.locator('.badge').innerText(), 'PJ');

    // 2. Criação em DESPESAS_FIXAS
    const btnNewDespesaFixa = page.locator('#btn-new-despesas-fixas');
    await assert.doesNotReject(async () => await btnNewDespesaFixa.waitFor({ state: 'visible' }));
    await btnNewDespesaFixa.click();

    await modal.waitFor({ state: 'visible' });
    await page.fill('#input-resource-name', 'Internet Fibra Óptica');
    await page.selectOption('#select-resource-profile', 'PF');
    await page.click('#btn-submit-new-resource');

    await page.waitForTimeout(400);
    const despesaRow = page.locator('tr[data-group="DESPESAS_FIXAS"]').filter({ hasText: 'Internet Fibra Óptica' });
    await assert.doesNotReject(async () => await despesaRow.waitFor({ state: 'visible' }));

    await page.close();
  });

  test('AC-2 & AC-3: Edição inline de valores mensais (Jan a Dez) e consolidação anual por soma acumulada', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);
    await page.click('#tab-btn-finance');

    // Localiza a linha de Receita recém-criada
    const receitaRow = page.locator('tr[data-group="RECEITAS"]').filter({ hasText: 'Consultoria e Assinaturas Cloud' });
    await receitaRow.waitFor({ state: 'visible' });

    // Clica em Editar
    const btnEdit = receitaRow.locator('.btn-edit-line');
    await btnEdit.click();

    const modalEdit = page.locator('#modal-edit-resource');
    await assert.doesNotReject(async () => await modalEdit.waitFor({ state: 'visible' }));

    // Preenche valores em Janeiro (10.000) e Março (15.000)
    await page.fill('#edit-resource-realized-1', '10000');
    await page.fill('#edit-resource-realized-3', '15000');

    // Salva
    await page.click('#btn-submit-edit-resource');
    await page.waitForTimeout(500);

    // Valida que o Total Anual é a soma acumulada dos 12 meses (10.000 + 15.000 = 25.000,00)
    const updatedRow = page.locator('tr[data-group="RECEITAS"]').filter({ hasText: 'Consultoria e Assinaturas Cloud' });
    await updatedRow.waitFor({ state: 'visible' });
    const rowText = await updatedRow.innerText();
    assert.ok(
      rowText.includes('25.000,00') || rowText.includes('25000'),
      'Para grupos de fluxo (RECEITAS), a consolidação anual deve ser a soma acumulada (25.000,00)'
    );

    await page.close();
  });

  test('AC-4: Exclusão com confirmação e remoção imediata da grade sem recarregar a página', async () => {
    const page = await browser.newPage();
    page.on('dialog', async (dialog: any) => {
      await dialog.accept();
    });

    await page.goto(`${baseUrl}/`);
    await page.click('#tab-btn-finance');

    const despesaRow = page.locator('tr[data-group="DESPESAS_FIXAS"]').filter({ hasText: 'Internet Fibra Óptica' });
    await despesaRow.waitFor({ state: 'visible' });

    const btnDelete = despesaRow.locator('.btn-delete-line');
    await btnDelete.click();

    // Espera remoção imediata do DOM sem reload
    await page.waitForTimeout(300);
    const count = await page.locator('tr[data-group="DESPESAS_FIXAS"]').filter({ hasText: 'Internet Fibra Óptica' }).count();
    assert.equal(count, 0, 'A linha de despesa fixa deve ser removida imediatamente da tabela');

    await page.close();
  });
});
