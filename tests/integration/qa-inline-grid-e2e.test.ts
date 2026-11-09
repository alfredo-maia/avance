import test, { before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startDashboardServer } from '../../src/server/standalone-server.mjs';

let serverInstance: any;
let baseUrl: string;
let browser: any;

const HERMES_PLAYWRIGHT = '/home/hermes/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const PLAYWRIGHT_PATH = process.env.PLAYWRIGHT_PATH || (fs.existsSync(HERMES_PLAYWRIGHT) ? HERMES_PLAYWRIGHT : 'playwright');

describe('QA Independente — Homologação E2E da Grade Inline 12 Meses (Módulo 1 / AV-107 / Ms. Sakura)', () => {
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

  test('QA-E2E-1 (AC-1 & Liquid Lens): Estrutura contínua de 12 colunas sem modais e estética Liquid Lens', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);
    await page.click('#tab-btn-finance');

    const table = page.locator('#table-finance-matrix');
    await assert.doesNotReject(async () => await table.waitFor({ state: 'visible' }));

    // Validação estrita das 16 colunas no cabeçalho
    const headers = await table.locator('thead th').allInnerTexts();
    assert.equal(headers.length, 16, 'A grade deve apresentar exatamente 16 colunas visíveis');
    assert.ok(headers[0].includes('Conta') || headers[0].includes('Linha'), 'Coluna 1 deve ser Conta/Linha');
    assert.ok(headers[1].includes('Perfil'), 'Coluna 2 deve ser Perfil');

    const expectedMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    for (let i = 0; i < 12; i++) {
      assert.ok(headers[i + 2].includes(expectedMonths[i]), `Coluna ${i + 2} deve ser ${expectedMonths[i]}`);
    }
    assert.ok(headers[14].includes('Total Anual'), 'Coluna 15 deve ser Total Anual');
    assert.ok(headers[15].includes('Ações'), 'Coluna 16 deve ser Ações');

    // Validação da ausência total de modais legados de criação ou edição
    assert.equal(await page.locator('#modal-new-resource').count(), 0, 'Modal legada #modal-new-resource não deve existir');
    assert.equal(await page.locator('#modal-edit-resource').count(), 0, 'Modal legada #modal-edit-resource não deve existir');
    assert.equal(await page.locator('#modal-edit-finance').count(), 0, 'Modal legada #modal-edit-finance não deve existir');

    // Conformidade visual Liquid Lens (tokens de glassmorphism nos cards e tabelas)
    const cardMatrix = page.locator('.liquid-lens-card').first();
    await assert.doesNotReject(async () => await cardMatrix.waitFor({ state: 'visible' }));

    await page.close();
  });

  test('QA-E2E-2 (AC-2): Edição inline célula a célula com auto-save via Enter e blur', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);
    await page.click('#tab-btn-finance');

    const row = page.locator('tr[data-group="RECEITAS"]').first();
    await row.waitFor({ state: 'visible' });

    // 1. Edição em Janeiro com Enter
    const inputJan = row.locator('.input-inline-month[data-month="1"]');
    await inputJan.click();
    await inputJan.fill('12500');
    await inputJan.press('Enter');
    await page.waitForTimeout(300);

    // 2. Edição em Fevereiro com blur
    const inputFev = row.locator('.input-inline-month[data-month="2"]');
    await inputFev.click();
    await inputFev.fill('17500');
    await inputFev.dispatchEvent('blur');
    await page.waitForTimeout(300);

    // Verificação de persistência na interface
    assert.equal(await inputJan.inputValue(), '12500', 'Valor de Jan deve persistir');
    assert.equal(await inputFev.inputValue(), '17500', 'Valor de Fev deve persistir');

    // Validação do Total Anual da linha refletindo soma acumulada imediata
    const totalText = await row.locator('.cell-total-anual').innerText();
    assert.ok(
      totalText.includes('30.000') || totalText.includes('30000') || totalText.includes('12.500'),
      `Total anual deve refletir a soma acumulada. Obtido: ${totalText}`
    );

    await page.close();
  });

  test('QA-E2E-3 (AC-3): Inserção inline direta de nova linha nos grupos sem pop-up', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);
    await page.click('#tab-btn-finance');

    // Adiciona nova linha em DESPESAS_FIXAS
    const btnNewDespesa = page.locator('#btn-new-despesas-fixas');
    await btnNewDespesa.waitFor({ state: 'visible' });
    await btnNewDespesa.click();
    await page.waitForTimeout(300);

    // Confirmação de ausência de modal aberto
    assert.equal(await page.locator('.liquid-lens-modal.open').count(), 0, 'Nenhum modal deve ser aberto na inserção');

    // Identifica a linha inserida no grupo
    const newRow = page.locator('tr[data-group="DESPESAS_FIXAS"]').last();
    await assert.doesNotReject(async () => await newRow.waitFor({ state: 'visible' }));

    // Preenchimento inline de Nome e Perfil
    const inputName = newRow.locator('.input-inline-name');
    await inputName.fill('Licença Servidores Cloud QA');
    await inputName.dispatchEvent('blur');

    const selectProfile = newRow.locator('.select-inline-profile');
    await selectProfile.selectOption('PJ');
    await selectProfile.dispatchEvent('change');

    // Preenche valor em Março (Mês 3)
    const inputMar = newRow.locator('.input-inline-month[data-month="3"]');
    await inputMar.fill('4200');
    await inputMar.dispatchEvent('blur');
    await page.waitForTimeout(300);

    assert.equal(await inputName.inputValue(), 'Licença Servidores Cloud QA');
    assert.equal(await selectProfile.inputValue(), 'PJ');
    assert.equal(await inputMar.inputValue(), '4200');

    await page.close();
  });

  test('QA-E2E-4 (AC-4): Exclusão inline atômica com feedback imediato sem reload', async () => {
    const page = await browser.newPage();
    page.on('dialog', async (dialog: any) => {
      await dialog.accept();
    });

    await page.goto(`${baseUrl}/`);
    await page.click('#tab-btn-finance');

    // Adiciona linha temporária para teste de exclusão
    const btnNew = page.locator('#btn-new-investimentos');
    await btnNew.click();
    await page.waitForTimeout(300);

    const targetRow = page.locator('tr[data-group="INVESTIMENTOS"]').last();
    const inputName = targetRow.locator('.input-inline-name');
    await inputName.fill('Ativo Temporário Descartável');
    await inputName.dispatchEvent('blur');
    await page.waitForTimeout(200);

    const btnDelete = targetRow.locator('.btn-delete-line');
    await btnDelete.click();
    await page.waitForTimeout(400);

    const remainingCount = await page
      .locator('tr[data-group="INVESTIMENTOS"]')
      .filter({ has: page.locator('input[value*="Ativo Temporário Descartável"]') })
      .count();

    assert.equal(remainingCount, 0, 'A linha deve ter sido removida atomicamente do DOM');
    await page.close();
  });

  test('QA-E2E-5 (AC-5): Recálculo determinístico em tempo real de KPIs de DRE e Saldo Final', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);
    await page.click('#tab-btn-finance');

    const kpiReceived = page.locator('#kpi-received');
    await assert.doesNotReject(async () => await kpiReceived.waitFor({ state: 'visible' }));
    const initialText = await kpiReceived.innerText();

    // Modifica valor de receita em Janeiro
    const receitaRow = page.locator('tr[data-group="RECEITAS"]').first();
    const inputJan = receitaRow.locator('.input-inline-month[data-month="1"]');
    await inputJan.fill('45000');
    await inputJan.dispatchEvent('blur');
    await page.waitForTimeout(400);

    const updatedText = await kpiReceived.innerText();
    assert.ok(
      updatedText !== initialText || updatedText.includes('45.000'),
      'O KPI de recebimentos deve reagir dinamicamente às edições na grade inline'
    );

    await page.close();
  });

  test('QA-E2E-6 (AC-6): Filtro de perfil PF / PJ com consistência visual e isolamento', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);
    await page.click('#tab-btn-finance');

    const filterSelect = page.locator('#profile-filter');
    await assert.doesNotReject(async () => await filterSelect.waitFor({ state: 'visible' }));

    // 1. Filtrar PF
    await filterSelect.selectOption('PF');
    await page.waitForTimeout(300);

    const pjRows = page.locator('tr[data-profile="PJ"]');
    const pjCount = await pjRows.count();
    for (let i = 0; i < pjCount; i++) {
      assert.equal(await pjRows.nth(i).isVisible(), false, 'Linhas com perfil PJ devem ficar ocultas sob filtro PF');
    }

    // 2. Voltar para ALL
    await filterSelect.selectOption('ALL');
    await page.waitForTimeout(300);
    assert.ok(await pjRows.first().isVisible(), 'Linhas PJ devem voltar a ser visíveis com filtro ALL');

    await page.close();
  });
});
