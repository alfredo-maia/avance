import test, { before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startDashboardServer } from '../../src/server/standalone-server.mjs';

let serverInstance: any;
let baseUrl: string;
let browser: any;

const HERMES_PLAYWRIGHT = '/home/hermes/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const PLAYWRIGHT_PATH = process.env.PLAYWRIGHT_PATH || (fs.existsSync(HERMES_PLAYWRIGHT) ? HERMES_PLAYWRIGHT : 'playwright');

describe('Gestão Completa dos Demais Grupos Financeiros UI — Grade Inline 12 Meses (AV-101 / AV-106)', () => {
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

  test('AC-1: Botões para criar novas linhas em RECEITAS, INVESTIMENTOS, DESPESAS_FIXAS e DESPESAS_VARIAVEIS diretamente na grade sem modais', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);
    await page.click('#tab-btn-finance');

    // 1. Criação em RECEITAS via botão "+ Nova Linha"
    const btnNewReceita = page.locator('#btn-new-receitas');
    await assert.doesNotReject(async () => await btnNewReceita.waitFor({ state: 'visible' }));
    await btnNewReceita.click();

    // Sem modais pop-up
    assert.equal(await page.locator('#modal-new-resource').count(), 0, 'Nenhum modal deve ser aberto');

    await page.waitForTimeout(300);
    const receitaRows = page.locator('tr[data-group="RECEITAS"]');
    const lastReceitaRow = receitaRows.last();
    await assert.doesNotReject(async () => await lastReceitaRow.waitFor({ state: 'visible' }));

    const nameInput = lastReceitaRow.locator('.input-inline-name');
    await nameInput.fill('Consultoria e Assinaturas Cloud');
    await nameInput.dispatchEvent('blur');

    const profileSelect = lastReceitaRow.locator('.select-inline-profile');
    await profileSelect.selectOption('PJ');
    await profileSelect.dispatchEvent('change');

    await page.waitForTimeout(400);

    // 2. Criação em INVESTIMENTOS
    const btnNewInv = page.locator('#btn-new-investimentos');
    await btnNewInv.click();
    await page.waitForTimeout(300);
    const lastInvRow = page.locator('tr[data-group="INVESTIMENTOS"]').last();
    await lastInvRow.locator('.input-inline-name').fill('Fundo Imobiliário HGLG11');
    await lastInvRow.locator('.input-inline-name').dispatchEvent('blur');

    // 3. Criação em DESPESAS_FIXAS
    const btnNewFix = page.locator('#btn-new-despesas-fixas');
    await btnNewFix.click();
    await page.waitForTimeout(300);
    const lastFixRow = page.locator('tr[data-group="DESPESAS_FIXAS"]').last();
    await lastFixRow.locator('.input-inline-name').fill('Internet Fibra Óptica');
    await lastFixRow.locator('.input-inline-name').dispatchEvent('blur');

    // 4. Criação em DESPESAS_VARIAVEIS
    const btnNewVar = page.locator('#btn-new-despesas-variaveis');
    await btnNewVar.click();
    await page.waitForTimeout(300);
    const lastVarRow = page.locator('tr[data-group="DESPESAS_VARIAVEIS"]').last();
    await lastVarRow.locator('.input-inline-name').fill('Uber e Transporte');
    await lastVarRow.locator('.input-inline-name').dispatchEvent('blur');

    await page.close();
  });

  test('AC-2 & AC-3: Edição inline de valores mensais (Jan a Dez) e consolidação anual por soma acumulada', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);
    await page.click('#tab-btn-finance');

    const receitaRow = page.locator('tr[data-group="RECEITAS"]').filter({ has: page.locator('input[value*="Consultoria e Assinaturas Cloud"]') });
    await receitaRow.waitFor({ state: 'visible' });

    // Preenche valores inline em Janeiro (10.000) e Março (15.000)
    const inputJan = receitaRow.locator('.input-inline-month[data-month="1"]');
    await inputJan.fill('10000');
    await inputJan.dispatchEvent('blur');

    const inputMar = receitaRow.locator('.input-inline-month[data-month="3"]');
    await inputMar.fill('15000');
    await inputMar.dispatchEvent('blur');

    await page.waitForTimeout(500);

    // Valida que o Total Anual é a soma acumulada dos 12 meses (10.000 + 15.000 = 25.000,00)
    const totalCell = receitaRow.locator('.cell-total-anual');
    await totalCell.waitFor({ state: 'visible' });
    const rowText = await totalCell.innerText();
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

    const despesaRow = page.locator('tr[data-group="DESPESAS_FIXAS"]').filter({ has: page.locator('input[value*="Internet Fibra Óptica"]') });
    await despesaRow.waitFor({ state: 'visible' });

    const btnDelete = despesaRow.locator('.btn-delete-line');
    await btnDelete.click();

    // Espera remoção imediata do DOM sem reload
    await page.waitForTimeout(400);
    const count = await page.locator('tr[data-group="DESPESAS_FIXAS"]').filter({ has: page.locator('input[value*="Internet Fibra Óptica"]') }).count();
    assert.equal(count, 0, 'A linha de despesa fixa deve ser removida imediatamente da tabela');

    await page.close();
  });
});
