import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLAYWRIGHT_PATH = process.env.PLAYWRIGHT_PATH || '/home/hermes/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
};

let server;
let baseUrl;
let browser;

before(async () => {
  server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      let pathname = parsedUrl.pathname;
      if (pathname === '/') pathname = '/index.html';

      const filePath = path.join(__dirname, pathname);
      if (!filePath.startsWith(__dirname)) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }

      const ext = path.extname(filePath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const content = await fs.readFile(filePath);

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (err) {
      res.statusCode = 404;
      res.end('Not Found');
    }
  });

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  const { chromium } = await import(PLAYWRIGHT_PATH);
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  if (browser) {
    await browser.close();
  }
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('AC-6: Interface HTML - Estado Inicial e Reatividade', async () => {
  const page = await browser.newPage();
  try {
    await page.goto(`${baseUrl}/index.html`);

    const setupBox = page.locator('#check-setup');
    const specBox = page.locator('#check-spec');
    const qaBox = page.locator('#check-qa');
    const statusBadge = page.locator('#status-badge');
    const missingList = page.locator('#missing-list');

    // 1. Estado inicial: desmarcadas, status Pendente e todas as faltantes
    assert.strictEqual(await setupBox.isChecked(), false);
    assert.strictEqual(await specBox.isChecked(), false);
    assert.strictEqual(await qaBox.isChecked(), false);
    assert.strictEqual((await statusBadge.textContent()).trim(), 'Pendente');

    let missing = (await missingList.locator('li').allTextContents()).map(s => s.trim());
    assert.deepStrictEqual(missing, ['setup', 'spec', 'qa']);

    // 2. Marcar Setup: status ainda Pendente, faltam spec e qa
    await setupBox.check();
    assert.strictEqual((await statusBadge.textContent()).trim(), 'Pendente');
    missing = (await missingList.locator('li').allTextContents()).map(s => s.trim());
    assert.deepStrictEqual(missing, ['spec', 'qa']);

    // 3. Marcar SPEC e QA: status torna-se Pronto
    await specBox.check();
    await qaBox.check();
    assert.strictEqual((await statusBadge.textContent()).trim(), 'Pronto');
    const emptyText = (await missingList.locator('li').first().textContent()).trim();
    assert.strictEqual(emptyText, 'Nenhuma pendência');

    // 4. Desmarcar QA: status volta a Pendente e lista 'qa'
    await qaBox.uncheck();
    assert.strictEqual((await statusBadge.textContent()).trim(), 'Pendente');
    missing = (await missingList.locator('li').allTextContents()).map(s => s.trim());
    assert.deepStrictEqual(missing, ['qa']);
  } finally {
    await page.close();
  }
});

test('AC-7: Acessibilidade da UI (labels, navegação por teclado e atributos ARIA)', async () => {
  const page = await browser.newPage();
  try {
    await page.goto(`${baseUrl}/index.html`);

    // 1. Labels associados explicitamente aos inputs
    const inputs = ['check-setup', 'check-spec', 'check-qa'];
    for (const id of inputs) {
      const label = page.locator(`label[for="${id}"]`);
      assert.strictEqual(await label.count(), 1, `Label para ${id} deve existir`);
      const text = (await label.textContent()).trim();
      assert.ok(text.length > 0, `Label para ${id} deve conter texto acessível`);
    }

    // 2. Região de status anunciável
    const statusBadge = page.locator('#status-badge');
    assert.strictEqual(await statusBadge.getAttribute('role'), 'status');
    assert.strictEqual(await statusBadge.getAttribute('aria-live'), 'polite');
    assert.strictEqual(await statusBadge.getAttribute('aria-atomic'), 'true');

    // 3. Navegação e alternância por teclado (Tab e Espaço)
    // Foca o primeiro input via Tab a partir do topo
    await page.keyboard.press('Tab');
    const focusedId1 = await page.evaluate(() => document.activeElement?.id);
    assert.strictEqual(focusedId1, 'check-setup', 'Primeiro Tab deve focar check-setup');

    // Alterna com Espaço
    await page.keyboard.press('Space');
    assert.strictEqual(await page.locator('#check-setup').isChecked(), true, 'Espaço deve marcar check-setup');

    // Próximo Tab foca check-spec
    await page.keyboard.press('Tab');
    const focusedId2 = await page.evaluate(() => document.activeElement?.id);
    assert.strictEqual(focusedId2, 'check-spec', 'Segundo Tab deve focar check-spec');

    await page.keyboard.press('Space');
    assert.strictEqual(await page.locator('#check-spec').isChecked(), true, 'Espaço deve marcar check-spec');

    // Próximo Tab foca check-qa
    await page.keyboard.press('Tab');
    const focusedId3 = await page.evaluate(() => document.activeElement?.id);
    assert.strictEqual(focusedId3, 'check-qa', 'Terceiro Tab deve focar check-qa');

    await page.keyboard.press('Space');
    assert.strictEqual(await page.locator('#check-qa').isChecked(), true, 'Espaço deve marcar check-qa');

    // Com as 3 marcadas via teclado, status deve ser Pronto
    assert.strictEqual((await statusBadge.textContent()).trim(), 'Pronto');
  } finally {
    await page.close();
  }
});

test('AC-8: Responsividade da UI (viewport de 360px sem estouro horizontal)', async () => {
  const page = await browser.newPage();
  try {
    // Configura viewport móvel estrito a 360px
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto(`${baseUrl}/index.html`);

    const hasHorizontalOverflow = await page.evaluate(() => {
      const scrollW = document.documentElement.scrollWidth;
      const clientW = document.documentElement.clientWidth;
      return scrollW > clientW;
    });

    assert.strictEqual(hasHorizontalOverflow, false, 'Não deve haver estouro ou scroll horizontal em 360px');

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      innerWidth: window.innerWidth,
    }));

    assert.ok(dimensions.scrollWidth <= 360, `scrollWidth (${dimensions.scrollWidth}) deve ser <= 360`);
  } finally {
    await page.close();
  }
});

test('AC-9: Isolamento e ausência de chamadas de rede externas', async () => {
  const page = await browser.newPage();
  const externalRequests = [];

  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
      externalRequests.push(request.url());
    }
  });

  try {
    await page.goto(`${baseUrl}/index.html`);
    assert.strictEqual(externalRequests.length, 0, 'Nenhuma requisição de rede externa permitida');
  } finally {
    await page.close();
  }
});

test('Botão Limpar: Presença, semântica e reset de estado completo e parcial (AC-1, AC-2, AC-3)', async () => {
  const page = await browser.newPage();
  try {
    await page.goto(`${baseUrl}/index.html`);

    const setupBox = page.locator('#check-setup');
    const specBox = page.locator('#check-spec');
    const qaBox = page.locator('#check-qa');
    const statusBadge = page.locator('#status-badge');
    const missingList = page.locator('#missing-list');
    const clearBtn = page.locator('#btn-clear');

    // AC-1: Presença e semântica do botão
    assert.strictEqual(await clearBtn.count(), 1, 'O botão #btn-clear deve existir');
    assert.strictEqual(await clearBtn.isVisible(), true, 'O botão #btn-clear deve ser visível');
    assert.strictEqual(await clearBtn.getAttribute('type'), 'button', 'O botão deve ter type="button"');
    assert.strictEqual((await clearBtn.textContent()).trim(), 'Limpar', 'O botão deve ter texto "Limpar"');

    // AC-2: Reset do estado completo para Pendente
    await setupBox.check();
    await specBox.check();
    await qaBox.check();
    assert.strictEqual((await statusBadge.textContent()).trim(), 'Pronto');
    assert.strictEqual(await statusBadge.evaluate(el => el.classList.contains('badge-ready')), true);

    await clearBtn.click();

    assert.strictEqual(await setupBox.isChecked(), false);
    assert.strictEqual(await specBox.isChecked(), false);
    assert.strictEqual(await qaBox.isChecked(), false);
    assert.strictEqual((await statusBadge.textContent()).trim(), 'Pendente');
    assert.strictEqual(await statusBadge.evaluate(el => el.classList.contains('badge-pending')), true);
    let missing = (await missingList.locator('li').allTextContents()).map(s => s.trim());
    assert.deepStrictEqual(missing, ['setup', 'spec', 'qa']);

    // AC-3: Reset de estado parcial e idempotência
    await setupBox.check();
    await qaBox.check();
    assert.strictEqual((await statusBadge.textContent()).trim(), 'Pendente');
    missing = (await missingList.locator('li').allTextContents()).map(s => s.trim());
    assert.deepStrictEqual(missing, ['spec']);

    await clearBtn.click();
    assert.strictEqual(await setupBox.isChecked(), false);
    assert.strictEqual(await specBox.isChecked(), false);
    assert.strictEqual(await qaBox.isChecked(), false);
    assert.strictEqual((await statusBadge.textContent()).trim(), 'Pendente');
    assert.strictEqual(await statusBadge.evaluate(el => el.classList.contains('badge-pending')), true);
    missing = (await missingList.locator('li').allTextContents()).map(s => s.trim());
    assert.deepStrictEqual(missing, ['setup', 'spec', 'qa']);

    await clearBtn.click();
    assert.strictEqual(await setupBox.isChecked(), false);
    assert.strictEqual(await specBox.isChecked(), false);
    assert.strictEqual(await qaBox.isChecked(), false);
    assert.strictEqual((await statusBadge.textContent()).trim(), 'Pendente');
    missing = (await missingList.locator('li').allTextContents()).map(s => s.trim());
    assert.deepStrictEqual(missing, ['setup', 'spec', 'qa']);
  } finally {
    await page.close();
  }
});

test('Botão Limpar: Acessibilidade e navegação por teclado (AC-4)', async () => {
  const page = await browser.newPage();
  try {
    await page.goto(`${baseUrl}/index.html`);

    const setupBox = page.locator('#check-setup');
    const specBox = page.locator('#check-spec');
    const qaBox = page.locator('#check-qa');
    const statusBadge = page.locator('#status-badge');
    const clearBtn = page.locator('#btn-clear');

    // Ordem de tabulação: check-setup -> check-spec -> check-qa -> btn-clear
    await page.keyboard.press('Tab');
    assert.strictEqual(await page.evaluate(() => document.activeElement?.id), 'check-setup');

    await page.keyboard.press('Tab');
    assert.strictEqual(await page.evaluate(() => document.activeElement?.id), 'check-spec');

    await page.keyboard.press('Tab');
    assert.strictEqual(await page.evaluate(() => document.activeElement?.id), 'check-qa');

    await page.keyboard.press('Space');
    assert.strictEqual(await qaBox.isChecked(), true);

    await page.keyboard.press('Tab');
    assert.strictEqual(await page.evaluate(() => document.activeElement?.id), 'btn-clear');
    const outlineStyle = await page.evaluate(() => window.getComputedStyle(document.getElementById('btn-clear')).outlineStyle);
    assert.strictEqual(outlineStyle, 'solid', 'Botão Limpar deve ter :focus-visible nítido com outline');

    // Acionamento via Enter
    await page.keyboard.press('Enter');
    assert.strictEqual(await qaBox.isChecked(), false);
    assert.strictEqual((await statusBadge.textContent()).trim(), 'Pendente');

    // Acionamento via Space
    await setupBox.check();
    assert.strictEqual(await setupBox.isChecked(), true);
    await clearBtn.focus();
    assert.strictEqual(await page.evaluate(() => document.activeElement?.id), 'btn-clear');
    await page.keyboard.press('Space');
    assert.strictEqual(await setupBox.isChecked(), false);
    assert.strictEqual((await statusBadge.textContent()).trim(), 'Pendente');
  } finally {
    await page.close();
  }
});

test('Botão Limpar: Responsividade e isolamento em viewport móvel 360x640 (AC-5)', async () => {
  const page = await browser.newPage();
  const externalRequests = [];

  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
      externalRequests.push(request.url());
    }
  });

  try {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto(`${baseUrl}/index.html`);

    const clearBtn = page.locator('#btn-clear');
    assert.strictEqual(await clearBtn.isVisible(), true, 'Botão Limpar deve estar visível em 360px');

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    assert.ok(dimensions.scrollWidth <= 360, `scrollWidth (${dimensions.scrollWidth}) deve ser <= 360`);
    assert.strictEqual(dimensions.scrollWidth <= dimensions.clientWidth, true, 'Sem overflow horizontal');
    assert.strictEqual(externalRequests.length, 0, 'Nenhuma requisição externa permitida');
  } finally {
    await page.close();
  }
});

test('Contador de verificações: Presença e estado inicial junto ao status (AC-1)', async () => {
  const page = await browser.newPage();
  try {
    await page.goto(`${baseUrl}/index.html`);

    const statusBadge = page.locator('#status-badge');
    const statusCount = page.locator('#status-count');

    // 1. O elemento #status-count deve existir dentro de .status-indicator
    assert.strictEqual(await statusCount.count(), 1, 'Elemento #status-count deve existir');
    const isInsideIndicator = await page.evaluate(() => {
      const el = document.getElementById('status-count');
      return el?.parentElement?.classList.contains('status-indicator');
    });
    assert.strictEqual(isInsideIndicator, true, '#status-count deve estar no bloco .status-indicator');

    // 2. Elemento deve ser span com classe status-count e visível
    assert.strictEqual(await statusCount.evaluate(el => el.tagName.toLowerCase()), 'span');
    assert.strictEqual(await statusCount.evaluate(el => el.classList.contains('status-count')), true);
    assert.strictEqual(await statusCount.isVisible(), true, '#status-count deve ser visível');

    // 3. Texto inicial deve ser "0 de 3"
    assert.strictEqual((await statusCount.textContent()).trim(), '0 de 3');

    // 4. Texto do #status-badge deve permanecer estritamente "Pendente"
    assert.strictEqual((await statusBadge.textContent()).trim(), 'Pendente');
  } finally {
    await page.close();
  }
});

test('Contador de verificações: Atualização reativa ao marcar e desmarcar etapas (AC-2)', async () => {
  const page = await browser.newPage();
  try {
    await page.goto(`${baseUrl}/index.html`);

    const setupBox = page.locator('#check-setup');
    const specBox = page.locator('#check-spec');
    const qaBox = page.locator('#check-qa');
    const statusBadge = page.locator('#status-badge');
    const statusCount = page.locator('#status-count');

    // Estado inicial
    assert.strictEqual((await statusCount.textContent()).trim(), '0 de 3');
    assert.strictEqual((await statusBadge.textContent()).trim(), 'Pendente');

    // Marcar 1 (setup) -> 1 de 3
    await setupBox.check();
    assert.strictEqual((await statusCount.textContent()).trim(), '1 de 3');
    assert.strictEqual((await statusBadge.textContent()).trim(), 'Pendente');

    // Marcar 2 (setup + spec) -> 2 de 3
    await specBox.check();
    assert.strictEqual((await statusCount.textContent()).trim(), '2 de 3');
    assert.strictEqual((await statusBadge.textContent()).trim(), 'Pendente');

    // Marcar 3 (setup + spec + qa) -> 3 de 3, status Pronto
    await qaBox.check();
    assert.strictEqual((await statusCount.textContent()).trim(), '3 de 3');
    assert.strictEqual((await statusBadge.textContent()).trim(), 'Pronto');

    // Desmarcar qa -> 2 de 3, status Pendente
    await qaBox.uncheck();
    assert.strictEqual((await statusCount.textContent()).trim(), '2 de 3');
    assert.strictEqual((await statusBadge.textContent()).trim(), 'Pendente');

    // Desmarcar spec -> 1 de 3, status Pendente
    await specBox.uncheck();
    assert.strictEqual((await statusCount.textContent()).trim(), '1 de 3');
    assert.strictEqual((await statusBadge.textContent()).trim(), 'Pendente');

    // Desmarcar setup -> 0 de 3, status Pendente
    await setupBox.uncheck();
    assert.strictEqual((await statusCount.textContent()).trim(), '0 de 3');
    assert.strictEqual((await statusBadge.textContent()).trim(), 'Pendente');

    // Testar combinação não sequencial: marcar qa e spec -> 2 de 3
    await qaBox.check();
    await specBox.check();
    assert.strictEqual((await statusCount.textContent()).trim(), '2 de 3');
    assert.strictEqual((await statusBadge.textContent()).trim(), 'Pendente');
  } finally {
    await page.close();
  }
});

test('Contador de verificações: Reset via botão Limpar a partir de estado parcial e completo (AC-3)', async () => {
  const page = await browser.newPage();
  try {
    await page.goto(`${baseUrl}/index.html`);

    const setupBox = page.locator('#check-setup');
    const specBox = page.locator('#check-spec');
    const qaBox = page.locator('#check-qa');
    const statusBadge = page.locator('#status-badge');
    const statusCount = page.locator('#status-count');
    const missingList = page.locator('#missing-list');
    const clearBtn = page.locator('#btn-clear');

    // 1. Estado parcial: marcar setup -> "1 de 3"
    await setupBox.check();
    assert.strictEqual((await statusCount.textContent()).trim(), '1 de 3');

    // Reset via Limpar
    await clearBtn.click();
    assert.strictEqual((await statusCount.textContent()).trim(), '0 de 3');
    assert.strictEqual((await statusBadge.textContent()).trim(), 'Pendente');
    let missing = (await missingList.locator('li').allTextContents()).map(s => s.trim());
    assert.deepStrictEqual(missing, ['setup', 'spec', 'qa']);

    // 2. Outro estado parcial: marcar spec e qa -> "2 de 3"
    await specBox.check();
    await qaBox.check();
    assert.strictEqual((await statusCount.textContent()).trim(), '2 de 3');

    await clearBtn.click();
    assert.strictEqual((await statusCount.textContent()).trim(), '0 de 3');
    assert.strictEqual((await statusBadge.textContent()).trim(), 'Pendente');
    missing = (await missingList.locator('li').allTextContents()).map(s => s.trim());
    assert.deepStrictEqual(missing, ['setup', 'spec', 'qa']);

    // 3. Estado completo: marcar todas as 3 -> "3 de 3"
    await setupBox.check();
    await specBox.check();
    await qaBox.check();
    assert.strictEqual((await statusCount.textContent()).trim(), '3 de 3');
    assert.strictEqual((await statusBadge.textContent()).trim(), 'Pronto');

    await clearBtn.click();
    assert.strictEqual((await statusCount.textContent()).trim(), '0 de 3');
    assert.strictEqual((await statusBadge.textContent()).trim(), 'Pendente');
    missing = (await missingList.locator('li').allTextContents()).map(s => s.trim());
    assert.deepStrictEqual(missing, ['setup', 'spec', 'qa']);
  } finally {
    await page.close();
  }
});

test('Contador de verificações: Acessibilidade e não-regressão de contratos (AC-4)', async () => {
  const page = await browser.newPage();
  try {
    await page.goto(`${baseUrl}/index.html`);

    const statusBadge = page.locator('#status-badge');

    // 1. #status-badge preserva role="status", aria-live="polite", aria-atomic="true"
    assert.strictEqual(await statusBadge.getAttribute('role'), 'status');
    assert.strictEqual(await statusBadge.getAttribute('aria-live'), 'polite');
    assert.strictEqual(await statusBadge.getAttribute('aria-atomic'), 'true');
    assert.strictEqual((await statusBadge.textContent()).trim(), 'Pendente');

    // 2. Ordem de tabulação inalterada: check-setup -> check-spec -> check-qa -> btn-clear
    await page.keyboard.press('Tab');
    assert.strictEqual(await page.evaluate(() => document.activeElement?.id), 'check-setup');

    await page.keyboard.press('Tab');
    assert.strictEqual(await page.evaluate(() => document.activeElement?.id), 'check-spec');

    await page.keyboard.press('Tab');
    assert.strictEqual(await page.evaluate(() => document.activeElement?.id), 'check-qa');

    await page.keyboard.press('Tab');
    assert.strictEqual(await page.evaluate(() => document.activeElement?.id), 'btn-clear');
  } finally {
    await page.close();
  }
});

test('Contador de verificações: Responsividade e isolamento em viewport móvel 360x640 (AC-5)', async () => {
  const page = await browser.newPage();
  const externalRequests = [];

  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
      externalRequests.push(request.url());
    }
  });

  try {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto(`${baseUrl}/index.html`);

    const statusCount = page.locator('#status-count');
    assert.strictEqual(await statusCount.isVisible(), true, '#status-count deve ser visível em 360px');

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    assert.ok(dimensions.scrollWidth <= 360, `scrollWidth (${dimensions.scrollWidth}) deve ser <= 360`);
    assert.strictEqual(dimensions.scrollWidth <= dimensions.clientWidth, true, 'Sem overflow horizontal em 360px');
    assert.strictEqual(externalRequests.length, 0, 'Nenhuma requisição externa permitida');
  } finally {
    await page.close();
  }
});
