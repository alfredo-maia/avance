import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SaaSStore } from '../../src/server/saas-store.ts';
import { createApiRouteHandlers } from '../../src/app/api/v1/route-handlers.ts';

describe('Gestão Completa de Recursos Financeiros (AV-100 / AC-1 a AC-6)', () => {
  let store: SaaSStore;
  let handlers: ReturnType<typeof createApiRouteHandlers>;
  let tenantId: string;

  beforeEach(() => {
    store = new SaaSStore();
    handlers = createApiRouteHandlers(store);
    const tenant = store.createTenantWithSeed('Finanças Org', 'financas-org', 'PRO');
    tenantId = tenant.id;
  });

  test('AC-1: Criação de nova linha de recurso financeiro com Nome e Perfil (PF/PJ)', async () => {
    // Via store
    const line = store.createFinancialLine(tenantId, {
      name: 'Caixa Econômica Poupança',
      profile: 'PF',
      group: 'RECURSOS_FINANCEIROS',
    });

    assert.ok(line.id);
    assert.equal(line.name, 'Caixa Econômica Poupança');
    assert.equal(line.profile, 'PF');
    assert.equal(line.group, 'RECURSOS_FINANCEIROS');
    assert.equal(line.tenantId, tenantId);
    assert.equal(Object.keys(line.months).length, 12);
    assert.equal(line.months[1].realized, 0);

    // Via API Handler
    const apiRes = await handlers.handlePostFinanceLine({
      tenantId,
      name: 'Conta Inter PJ',
      profile: 'PJ',
      group: 'RECURSOS_FINANCEIROS',
    });

    assert.equal(apiRes.status, 201);
    assert.equal(apiRes.data.name, 'Conta Inter PJ');
    assert.equal(apiRes.data.profile, 'PJ');
    assert.equal(apiRes.data.group, 'RECURSOS_FINANCEIROS');
  });

  test('AC-2: Edição do nome e perfil de uma conta de recursos existente', async () => {
    const line = store.createFinancialLine(tenantId, {
      name: 'Banco Antigo',
      profile: 'PF',
    });

    // Via store
    const updated = store.updateFinancialLine(tenantId, line.id, {
      name: 'Banco XP Investimentos',
      profile: 'PJ',
    });

    assert.equal(updated.name, 'Banco XP Investimentos');
    assert.equal(updated.profile, 'PJ');

    // Via API Handler
    const apiRes = await handlers.handlePutFinanceLine({
      tenantId,
      lineId: line.id,
      name: 'Banco BTG Pactual',
      profile: 'PF',
    });

    assert.equal(apiRes.status, 200);
    assert.equal(apiRes.data.name, 'Banco BTG Pactual');
    assert.equal(apiRes.data.profile, 'PF');
  });

  test('AC-3 & AC-4: Atualização de saldos mensais (Jan..Dez) preservando regra do Último Saldo Informado', async () => {
    const line = store.createFinancialLine(tenantId, {
      name: 'CDB Liquidez Diária',
      profile: 'PF',
    });

    // Atualiza meses Jan, Fev, Mar
    store.updateFinancialLine(tenantId, line.id, {
      months: {
        1: { realized: 10000, target: 10000 },
        2: { realized: 12500, target: 12000 },
        3: { realized: 15000, target: 14000 },
      },
    });

    // Checa cálculo no dashboard
    const dash = store.getDashboard(tenantId, 2026, 3, '2026-03-15');
    const computedLine = dash.finance.lines.find((l) => l.id === line.id);

    assert.ok(computedLine);
    // AC-4: O totalRealized de RECURSOS_FINANCEIROS deve ser exatamente o último mês com saldo > 0 (Mês 3 = 15000)
    assert.equal(computedLine.totalRealized, 15000);
    assert.equal(computedLine.months[1].realized, 10000);
    assert.equal(computedLine.months[2].realized, 12500);
    assert.equal(computedLine.months[3].realized, 15000);

    // Atualiza mês 5 via API handler
    const apiRes = await handlers.handlePutFinanceLine({
      tenantId,
      lineId: line.id,
      months: {
        5: { realized: 22000, target: 20000 },
      },
    });

    assert.equal(apiRes.status, 200);

    // O último saldo informado agora deve ser do mês 5 (22000)
    const dashUpdated = store.getDashboard(tenantId, 2026, 5, '2026-05-15');
    const computedLineUpdated = dashUpdated.finance.lines.find((l) => l.id === line.id);
    assert.equal(computedLineUpdated?.totalRealized, 22000);
  });

  test('AC-5: Exclusão de linha de recurso financeiro com impacto recalculado no patrimônio', async () => {
    const line = store.createFinancialLine(tenantId, {
      name: 'Conta Transitória',
      profile: 'PF',
      months: {
        1: { realized: 50000 },
      },
    });

    const dashBefore = store.getDashboard(tenantId, 2026, 1, '2026-01-15');
    const assetsBefore = dashBefore.finance.kpis.totalAssetsLastBalance;

    // Via API DELETE
    const delRes = await handlers.handleDeleteFinanceLine({
      tenantId,
      lineId: line.id,
    });

    assert.equal(delRes.status, 200);
    assert.equal(delRes.data.success, true);

    // Linha não deve mais existir no dashboard
    const dashAfter = store.getDashboard(tenantId, 2026, 1, '2026-01-15');
    assert.ok(!dashAfter.finance.lines.some((l) => l.id === line.id));
    assert.equal(dashAfter.finance.kpis.totalAssetsLastBalance, assetsBefore - 50000);
  });

  test('Isolamento Multi-Tenant estrito em mutações de linhas', async () => {
    const otherTenant = store.createTenantWithSeed('Outra Empresa', 'outra-empresa');
    const line = store.createFinancialLine(tenantId, {
      name: 'Cofre Empresa 1',
      profile: 'PJ',
    });

    // Tentativa de update com tenant incorreto
    assert.throws(() => {
      store.updateFinancialLine(otherTenant.id, line.id, { name: 'Tentativa Invasão' });
    }, /NotFoundError|Tenant isolation violation/);

    // Tentativa de delete com tenant incorreto
    assert.throws(() => {
      store.deleteFinancialLine(otherTenant.id, line.id);
    }, /NotFoundError|Tenant isolation violation/);
  });
});
