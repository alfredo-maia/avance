import test, { before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startDashboardServer } from '../../src/server/standalone-server.mjs';

let serverInstance: any;
let baseUrl: string;
let browser: any;

const HERMES_PLAYWRIGHT = '/home/hermes/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const PLAYWRIGHT_PATH = process.env.PLAYWRIGHT_PATH || (fs.existsSync(HERMES_PLAYWRIGHT) ? HERMES_PLAYWRIGHT : 'playwright');

describe('Grade Inline de 12 Meses e Edição sem Modais UI (AV-106 / AC-1 a AC-6)', () => {
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

  test('AC-1: Visualização da Grade com 12 colunas contínuas (Jan..Dez) lado a lado em todos os grupos', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);
    await page.click('#tab-btn-finance');

    const table = page.locator('#table-finance-matrix');
    await assert.doesNotReject(async () => await table.waitFor({ state: 'visible' }));

    // Valida os 16 cabeçalhos da tabela
    const headers = await table.locator('thead th').allInnerTexts();
    assert.equal(headers.length, 16, 'Deve conter 16 colunas na grade inline');
    assert.ok(headers[0].includes('Conta') || headers[0].includes('Linha'));
    assert.ok(headers[1].includes('Perfil'));
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    for (let i = 0; i < 12; i++) {
      assert.ok(headers[i + 2].includes(months[i]), `Coluna ${i + 2} deve ser ${months[i]}`);
    }
    assert.ok(headers[14].includes('Total Anual'));
    assert.ok(headers[15].includes('Ações'));

    // Valida que não existem modais de linha ou edição mensal
    assert.equal(await page.locator('#modal-new-resource').count(), 0);
    assert.equal(await page.locator('#modal-edit-resource').count(), 0);
    assert.equal(await page.locator('#modal-edit-finance').count(), 0);

    await page.close();
  });

  test('AC-2: Edição inline célula a célula com foco por clique / Tab / Enter e auto-save', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);
    await page.click('#tab-btn-finance');

    // Localiza uma linha de receita existente
    const row = page.locator('tr[data-group="RECEITAS"]').first();
    await row.waitFor({ state: 'visible' });

    // Foca a célula de Janeiro (Mês 1)
    const inputJan = row.locator('.input-inline-month[data-month="1"]');
    await inputJan.click();
    await inputJan.fill('8500');

    // Pressiona Enter para auto-save e navegação
    await inputJan.press('Enter');
    await page.waitForTimeout(400);

    // Foca e preenche célula de Fevereiro (Mês 2)
    const inputFev = row.locator('.input-inline-month[data-month="2"]');
    await inputFev.click();
    await inputFev.fill('9500');
    await inputFev.dispatchEvent('blur');
    await page.waitForTimeout(400);

    // Valida que os valores permanecem na célula
    assert.equal(await inputJan.inputValue(), '8500');
    assert.equal(await inputFev.inputValue(), '9500');

    // Total Anual da linha é recalculado
    const totalCell = row.locator('.cell-total-anual');
    const totalText = await totalCell.innerText();
    assert.ok(totalText.includes('18.000,00') || totalText.includes('18000') || totalText.includes('8.500'), 'Total deve refletir a soma');

    await page.close();
  });

  test('AC-3: Inserção inline direta via "+ Nova Linha" com foco imediato no Nome da Conta', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);
    await page.click('#tab-btn-finance');

    const btnNew = page.locator('#btn-new-investimentos');
    await btnNew.click();
    await page.waitForTimeout(300);

    // Nenhuma janela modal aberta
    assert.equal(await page.locator('.liquid-lens-modal.open').count(), 0);

    // Nova linha criada com input de nome
    const newRow = page.locator('tr[data-group="INVESTIMENTOS"]').last();
    await assert.doesNotReject(async () => await newRow.waitFor({ state: 'visible' }));

    const nameInput = newRow.locator('.input-inline-name');
    await nameInput.fill('Fundo de Ações Dividendos');
    await nameInput.dispatchEvent('blur');

    const profileSelect = newRow.locator('.select-inline-profile');
    await profileSelect.selectOption('PJ');
    await profileSelect.dispatchEvent('change');

    // Preenche valor em Jan
    const inputJan = newRow.locator('.input-inline-month[data-month="1"]');
    await inputJan.fill('5000');
    await inputJan.dispatchEvent('blur');

    await page.waitForTimeout(400);
    assert.equal(await nameInput.inputValue(), 'Fundo de Ações Dividendos');
    assert.equal(await profileSelect.inputValue(), 'PJ');
    assert.equal(await inputJan.inputValue(), '5000');

    await page.close();
  });

  test('AC-4: Exclusão inline instantânea com atualização do estado', async () => {
    const page = await browser.newPage();
    page.on('dialog', async (dialog: any) => {
      await dialog.accept();
    });

    await page.goto(`${baseUrl}/`);
    await page.click('#tab-btn-finance');

    const row = page.locator('tr[data-group="INVESTIMENTOS"]').filter({ has: page.locator('input[value*="Fundo de Ações Dividendos"]') });
    await row.waitFor({ state: 'visible' });

    const btnDel = row.locator('.btn-delete-line');
    await btnDel.click();

    await page.waitForTimeout(400);
    const count = await page.locator('tr[data-group="INVESTIMENTOS"]').filter({ has: page.locator('input[value*="Fundo de Ações Dividendos"]') }).count();
    assert.equal(count, 0, 'Linha deve ser removida instantaneamente');

    await page.close();
  });

  test('AC-5: Recálculo determinístico em tempo real do Total Anual e DRE / Saldo Final', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);
    await page.click('#tab-btn-finance');

    // Lê valor inicial do KPI de Recebido no Mês
    const kpiReceived = page.locator('#kpi-received');
    await assert.doesNotReject(async () => await kpiReceived.waitFor({ state: 'visible' }));

    // Altera valor de receita em Janeiro
    const receitaRow = page.locator('tr[data-group="RECEITAS"]').first();
    const inputJan = receitaRow.locator('.input-inline-month[data-month="1"]');
    await inputJan.fill('30000');
    await inputJan.dispatchEvent('blur');

    await page.waitForTimeout(400);

    // KPI atualizado em tempo real sem reload
    const kpiText = await kpiReceived.innerText();
    assert.ok(kpiText.includes('30.000') || kpiText.includes('50.000'), 'KPI recebido deve ser atualizado dinamicamente');

    await page.close();
  });

  test('AC-6: Filtro de Visão PF / PJ alternando linhas e preservando a consistência dos cálculos', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);
    await page.click('#tab-btn-finance');

    const filterSelect = page.locator('#profile-filter');
    await assert.doesNotReject(async () => await filterSelect.waitFor({ state: 'visible' }));

    // Seleciona visão PF
    await filterSelect.selectOption('PF');
    await page.waitForTimeout(300);

    // Linhas PJ devem ficar ocultas
    const pjRows = page.locator('tr[data-profile="PJ"]');
    const pjCount = await pjRows.count();
    for (let i = 0; i < pjCount; i++) {
      assert.equal(await pjRows.nth(i).isVisible(), false, 'Linha PJ não deve estar visível na visão PF');
    }

    // Seleciona visão Todos
    await filterSelect.selectOption('ALL');
    await page.waitForTimeout(300);
    assert.ok(await pjRows.first().isVisible(), 'Linha PJ volta a ficar visível na visão Todos');

    await page.close();
  });
});
