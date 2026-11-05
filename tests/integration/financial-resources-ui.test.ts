import test, { before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startDashboardServer } from '../../src/server/standalone-server.mjs';

let serverInstance: any;
let baseUrl: string;
let browser: any;

const HERMES_PLAYWRIGHT = '/home/hermes/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const PLAYWRIGHT_PATH = process.env.PLAYWRIGHT_PATH || (fs.existsSync(HERMES_PLAYWRIGHT) ? HERMES_PLAYWRIGHT : 'playwright');

describe('Gestão Completa de Recursos Financeiros UI (AV-100 / AC-1 a AC-6)', () => {
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

  test('AC-1: Botão e modal para criar nova conta em RECURSOS_FINANCEIROS com Nome e Perfil (PF/PJ)', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);

    // Aba Controle Finanças
    await page.click('#tab-btn-finance');
    const btnNewResource = page.locator('#btn-new-resource');
    await assert.doesNotReject(async () => await btnNewResource.waitFor({ state: 'visible' }));

    // Clica para abrir modal
    await btnNewResource.click();
    const modal = page.locator('#modal-new-resource');
    await assert.doesNotReject(async () => await modal.waitFor({ state: 'visible' }));

    // Preenche dados da nova conta
    await page.fill('#input-resource-name', 'Investimento CDB DI');
    await page.selectOption('#select-resource-profile', 'PF');
    await page.click('#btn-submit-new-resource');

    // Aguarda reload e verifica presença da nova conta na tabela
    await page.waitForTimeout(500);
    const row = page.locator('tr[data-group="RECURSOS_FINANCEIROS"]').filter({ hasText: 'Investimento CDB DI' });
    await assert.doesNotReject(async () => await row.waitFor({ state: 'visible' }));
    const profileBadge = row.locator('.badge');
    assert.equal(await profileBadge.innerText(), 'PF');

    await page.close();
  });

  test('AC-2, AC-3 & AC-4: Edição de conta, perfil e saldos mensais preservando Último Saldo Informado', async () => {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/`);
    await page.click('#tab-btn-finance');

    const row = page.locator('tr[data-group="RECURSOS_FINANCEIROS"]').filter({ hasText: 'Investimento CDB DI' });
    await row.waitFor({ state: 'visible' });

    // Clica no botão de editar da linha
    const btnEdit = row.locator('.btn-edit-resource');
    await btnEdit.click();

    const modalEdit = page.locator('#modal-edit-resource');
    await assert.doesNotReject(async () => await modalEdit.waitFor({ state: 'visible' }));

    // Altera nome e perfil
    await page.fill('#edit-resource-name', 'Investimento CDB DI PJ Turbo');
    await page.selectOption('#edit-resource-profile', 'PJ');

    // Informa saldos de Jan e Mar
    await page.fill('#edit-resource-realized-1', '10000');
    await page.fill('#edit-resource-realized-3', '18500');

    // Salva
    await page.click('#btn-submit-edit-resource');
    await page.waitForTimeout(500);

    // Verifica linha atualizada
    const updatedRow = page.locator('tr[data-group="RECURSOS_FINANCEIROS"]').filter({ hasText: 'Investimento CDB DI PJ Turbo' });
    await assert.doesNotReject(async () => await updatedRow.waitFor({ state: 'visible' }));
    assert.equal(await updatedRow.locator('.badge').innerText(), 'PJ');

    // Verifica total anual calculado pela regra do último saldo informado (18.500,00)
    const rowText = await updatedRow.innerText();
    assert.ok(rowText.includes('18.500,00') || rowText.includes('18500'), 'Total deve refletir o último saldo informado de 18.500');

    await page.close();
  });

  test('AC-5: Exclusão de linha de recurso financeiro com confirmação', async () => {
    const page = await browser.newPage();
    // Configura aceite automático do diálogo de confirmação
    page.on('dialog', async (dialog: any) => {
      await dialog.accept();
    });

    await page.goto(`${baseUrl}/`);
    await page.click('#tab-btn-finance');

    const row = page.locator('tr[data-group="RECURSOS_FINANCEIROS"]').filter({ hasText: 'Investimento CDB DI PJ Turbo' });
    await row.waitFor({ state: 'visible' });

    const btnDelete = row.locator('.btn-delete-resource');
    await btnDelete.click();

    await page.waitForTimeout(500);
    const count = await page.locator('tr[data-group="RECURSOS_FINANCEIROS"]').filter({ hasText: 'Investimento CDB DI PJ Turbo' }).count();
    assert.equal(count, 0, 'A linha deve ter sido removida da tabela');

    await page.close();
  });
});
