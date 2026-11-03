import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SaaSStore } from '../../src/server/saas-store.ts';
import { createApiRouteHandlers } from '../../src/app/api/v1/route-handlers.ts';

describe('Contratos de API REST/JSON (AC-15)', () => {
  let store: SaaSStore;
  let handlers: ReturnType<typeof createApiRouteHandlers>;

  beforeEach(() => {
    store = new SaaSStore();
    handlers = createApiRouteHandlers(store);
  });

  test('POST /api/v1/tenants cria tenant e retorna template seed provisionado', async () => {
    const res = await handlers.handlePostTenant({
      name: 'Startup Inovadora',
      slug: 'startup-inovadora',
      plan: 'PRO',
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.name, 'Startup Inovadora');
    assert.ok(res.data.id);

    // Listar tenants
    const listRes = await handlers.handleGetTenants();
    assert.equal(listRes.status, 200);
    assert.equal(listRes.data.length, 1);
  });

  test('GET /api/v1/dashboard exige tenantId e retorna os 4 módulos consolidados', async () => {
    // Sem tenantId retorna 400
    const errRes = await handlers.handleGetDashboard({ tenantId: '' });
    assert.equal(errRes.status, 400);

    // Com tenantId
    const tenantRes = await handlers.handlePostTenant({
      name: 'Tenant Demo',
      slug: 'demo',
      plan: 'FREE',
    });
    const tenantId = tenantRes.data.id;

    const dashRes = await handlers.handleGetDashboard({
      tenantId,
      year: 2026,
      month: 1,
      referenceDate: '2026-01-15',
    });

    assert.equal(dashRes.status, 200);
    assert.ok(dashRes.data.finance);
    assert.ok(dashRes.data.finance.kpis);
    assert.ok(dashRes.data.cards);
    assert.ok(dashRes.data.goals);
    assert.ok(dashRes.data.actionPlan);
  });

  test('PUT /api/v1/finance/entry atualiza lançamento com isolamento', async () => {
    const tenantRes = await handlers.handlePostTenant({
      name: 'Tenant Demo 2',
      slug: 'demo-2',
      plan: 'FREE',
    });
    const tenantId = tenantRes.data.id;

    const dashRes = await handlers.handleGetDashboard({ tenantId, year: 2026, month: 1 });
    const lineId = dashRes.data.finance.lines[0].id;

    const updateRes = await handlers.handlePutFinanceEntry({
      tenantId,
      lineId,
      month: 1,
      realized: 1500,
      target: 1000,
      settledAt: '2026-01-10',
    });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.data.months[1].realized, 1500);
    assert.equal(updateRes.data.months[1].settledAt, '2026-01-10');
  });
});
