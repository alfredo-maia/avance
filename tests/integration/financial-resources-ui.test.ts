import test, { before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startDashboardServer } from '../../src/server/standalone-server.mjs';

let serverInstance: any;
let baseUrl: string;
let browser: any;

const HERMES_PLAYWRIGHT = '/home/hermes/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const PLAYWRIGHT_PATH = process.env.PLAYWRIGHT_PATH || (fs.existsSync(HERMES_PLAYWRIGHT) ? HERMES_PLAYWRIGHT : 'playwright');

describe('Gestão Completa de Recursos Financeiros UI — Grade Inline 12 Meses (AV-100 / AV-106)', () => {
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

  test('AC-1: Botão para criar nova linha em RECURSOS_FINANCEIROS diretamente na grade sem modal com foco no Nome', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);

    // Aba Controle Finanças
    await page.click('#tab-btn-finance');
    const btnNewResource = page.locator('#btn-new-resource');
    await assert.doesNotReject(async () => await btnNewResource.waitFor({ state: 'visible' }));

    // Clica para adicionar nova linha inline
    await btnNewResource.click();
    await page.waitForTimeout(300);

    // Sem modais pop-up
    assert.equal(await page.locator('#modal-new-resource').count(), 0, 'Nenhum modal deve ser aberto');

    // Localiza a linha inserida em RECURSOS_FINANCEIROS
    const rows = page.locator('tr[data-group="RECURSOS_FINANCEIROS"]');
    const lastRow = rows.last();
    await assert.doesNotReject(async () => await lastRow.waitFor({ state: 'visible' }));

    // Preenche dados da nova conta diretamente na linha
    const nameInput = lastRow.locator('.input-inline-name');
    await nameInput.fill('Investimento CDB DI');
    await nameInput.dispatchEvent('blur');

    const profileSelect = lastRow.locator('.select-inline-profile');
    await profileSelect.selectOption('PF');
    await profileSelect.dispatchEvent('change');

    await page.waitForTimeout(400);
    assert.equal(await nameInput.inputValue(), 'Investimento CDB DI');
    assert.equal(await profileSelect.inputValue(), 'PF');

    await page.close();
  });

  test('AC-2, AC-3 & AC-4: Edição inline de conta, perfil e saldos mensais preservando Último Saldo Informado', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);
    await page.click('#tab-btn-finance');

    const row = page.locator('tr[data-group="RECURSOS_FINANCEIROS"]').filter({ has: page.locator('input[value*="Investimento CDB DI"]') });
    await row.waitFor({ state: 'visible' });

    // Altera nome e perfil inline
    const nameInput = row.locator('.input-inline-name');
    await nameInput.fill('Investimento CDB DI PJ Turbo');
    await nameInput.dispatchEvent('blur');

    const profileSelect = row.locator('.select-inline-profile');
    await profileSelect.selectOption('PJ');
    await profileSelect.dispatchEvent('change');

    // Informa saldos de Jan (10.000) e Mar (18.500)
    const inputJan = row.locator('.input-inline-month[data-month="1"]');
    await inputJan.fill('10000');
    await inputJan.dispatchEvent('blur');

    const inputMar = row.locator('.input-inline-month[data-month="3"]');
    await inputMar.fill('18500');
    await inputMar.dispatchEvent('blur');

    await page.waitForTimeout(500);

    // Verifica linha atualizada
    assert.equal(await profileSelect.inputValue(), 'PJ');

    // Verifica total anual calculado pela regra do último saldo informado (18.500,00)
    const totalCell = row.locator('.cell-total-anual');
    const totalText = await totalCell.innerText();
    assert.ok(totalText.includes('18.500,00') || totalText.includes('18500'), 'Total deve refletir o último saldo informado de 18.500');

    await page.close();
  });

  test('AC-5: Exclusão de linha de recurso financeiro com confirmação', async () => {
    const page = await browser.newPage();
    page.on('dialog', async (dialog: any) => {
      await dialog.accept();
    });

    await page.goto(`${baseUrl}/`);
    await page.click('#tab-btn-finance');

    const row = page.locator('tr[data-group="RECURSOS_FINANCEIROS"]').filter({ has: page.locator('input[value*="Investimento CDB DI PJ Turbo"]') });
    await row.waitFor({ state: 'visible' });

    const btnDelete = row.locator('.btn-delete-resource');
    await btnDelete.click();

    await page.waitForTimeout(500);
    const count = await page.locator('tr[data-group="RECURSOS_FINANCEIROS"]').filter({ has: page.locator('input[value*="Investimento CDB DI PJ Turbo"]') }).count();
    assert.equal(count, 0, 'A linha deve ter sido removida da tabela');

    await page.close();
  });
});
