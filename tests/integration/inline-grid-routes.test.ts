import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { URL } from 'node:url';
import { SaaSStore } from '../../src/server/saas-store.ts';
import { createApiRouteHandlers } from '../../src/app/api/v1/route-handlers.ts';

describe('HTTP Endpoints de Grade Inline (AV-105 / Standalone Server)', () => {
  let server: http.Server;
  let port: number;
  let baseUrl: string;
  let store: SaaSStore;
  let handlers: ReturnType<typeof createApiRouteHandlers>;
  let tenantId: string;

  before(async () => {
    store = new SaaSStore();
    handlers = createApiRouteHandlers(store);
    const tenant = store.createTenantWithSeed('HTTP Test Tenant', 'http-test', 'PRO');
    tenantId = tenant.id;

    server = http.createServer(async (req, res) => {
      const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const pathname = parsedUrl.pathname;
      const method = (req.method || 'GET').toUpperCase();

      const readBody = async () => {
        return new Promise<any>((resolve, reject) => {
          let bodyStr = '';
          req.on('data', (chunk) => { bodyStr += chunk; });
          req.on('end', () => {
            try {
              resolve(bodyStr ? JSON.parse(bodyStr) : {});
            } catch (e) {
              reject(e);
            }
          });
          req.on('error', reject);
        });
      };

      if (pathname === '/api/v1/finance/cell' && (method === 'PATCH' || method === 'PUT' || method === 'POST')) {
        const body = await readBody();
        const result = await handlers.handlePatchFinanceCell(body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
      }

      if (pathname === '/api/v1/finance/entry' && (method === 'PUT' || method === 'POST' || method === 'PATCH')) {
        const body = await readBody();
        const result = await handlers.handlePutFinanceEntry(body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
      }

      if (pathname === '/api/v1/finance/line/inline' && method === 'POST') {
        const body = await readBody();
        const result = await handlers.handlePostInlineFinanceLine(body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
      }

      if (pathname === '/api/v1/finance/line') {
        if (method === 'POST') {
          const body = await readBody();
          const result = await handlers.handlePostFinanceLine(body);
          res.writeHead(result.status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
          return;
        }
        if (method === 'PUT' || method === 'PATCH') {
          const body = await readBody();
          const result = await handlers.handlePutFinanceLine(body);
          res.writeHead(result.status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
          return;
        }
        if (method === 'DELETE') {
          let body: any = {};
          try { body = await readBody(); } catch { body = {}; }
          const query = Object.fromEntries(parsedUrl.searchParams.entries());
          const payload = {
            tenantId: body.tenantId || query.tenantId,
            lineId: body.lineId || query.lineId,
          };
          const result = await handlers.handleDeleteFinanceLine(payload);
          res.writeHead(result.status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
          return;
        }
      }

      res.writeHead(404);
      res.end('Not Found');
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address() as any;
        port = address.port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test('POST /api/v1/finance/line/inline cria linha inline via HTTP', async () => {
    const res = await fetch(`${baseUrl}/api/v1/finance/line/inline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        group: 'RECEITAS',
        name: 'Venda Consultoria HTTP',
        profile: 'PJ',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.data.name, 'Venda Consultoria HTTP');
    assert.equal(body.data.group, 'RECEITAS');
    assert.equal(body.data.months[1].realized, 0);
    assert.equal(body.data.computed.totalRealized, 0);
  });

  test('PATCH /api/v1/finance/cell atualiza célula mensal via HTTP com auto-save', async () => {
    const createRes = await fetch(`${baseUrl}/api/v1/finance/line/inline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        group: 'RECEITAS',
        name: 'Contrato Recorrente',
      }),
    });
    const created = await createRes.json();
    const lineId = created.data.id;

    const patchRes = await fetch(`${baseUrl}/api/v1/finance/cell`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        lineId,
        month: 2,
        realized: 5400,
        target: 5000,
      }),
    });

    assert.equal(patchRes.status, 200);
    const patchBody = await patchRes.json();
    assert.equal(patchBody.data.months[2].realized, 5400);
    assert.equal(patchBody.data.computed.totalRealized, 5400);
    assert.ok(patchBody.data.kpis);
  });

  test('PATCH /api/v1/finance/line atualiza metadados da linha inline via HTTP', async () => {
    const createRes = await fetch(`${baseUrl}/api/v1/finance/line/inline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        group: 'DESPESAS_FIXAS',
        name: 'Internet',
      }),
    });
    const created = await createRes.json();
    const lineId = created.data.id;

    const patchRes = await fetch(`${baseUrl}/api/v1/finance/line`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        lineId,
        name: 'Fibra Óptica Dedicada PJ',
        profile: 'PJ',
      }),
    });

    assert.equal(patchRes.status, 200);
    const patchBody = await patchRes.json();
    assert.equal(patchBody.data.name, 'Fibra Óptica Dedicada PJ');
    assert.equal(patchBody.data.profile, 'PJ');
  });
});
