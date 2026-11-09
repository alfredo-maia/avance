import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { SaaSStore } from '../../src/server/saas-store.ts';
import { createApiRouteHandlers } from '../../src/app/api/v1/route-handlers.ts';
import type { FinancialGroup } from '../../src/domain/types.ts';

describe('QA Independente — Grade Inline de 12 Meses (Módulo 1 / AV-105 / Ms. Sakura)', () => {
  test('QA-1: Criação inline direta nos 5 grupos com defaults de 12 meses zerados e computed line', async () => {
    const store = new SaaSStore();
    const handlers = createApiRouteHandlers(store);
    const tenant = store.createTenantWithSeed('QA Tenant 1', 'qa-tenant-1');

    const groups: FinancialGroup[] = [
      'RECEITAS',
      'INVESTIMENTOS',
      'DESPESAS_FIXAS',
      'DESPESAS_VARIAVEIS',
      'RECURSOS_FINANCEIROS',
    ];

    for (const group of groups) {
      const res = await handlers.handlePostInlineFinanceLine({
        tenantId: tenant.id,
        group,
        name: `Linha QA ${group}`,
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.group, group);
      assert.equal(res.data.name, `Linha QA ${group}`);
      assert.equal(Object.keys(res.data.months).length, 12);
      for (let m = 1; m <= 12; m++) {
        assert.equal(res.data.months[m].realized, 0);
        assert.equal(res.data.months[m].target, 0);
        assert.equal(res.data.months[m].settledAt, null);
      }
      assert.equal(res.data.computed.totalRealized, 0);
      assert.equal(res.data.computed.totalTarget, 0);
      assert.ok(res.data.kpis !== undefined, 'KPIs devem ser retornados no payload');
    }
  });

  test('QA-2: Validação de entradas e limites no endpoint PATCH /api/v1/finance/cell', async () => {
    const store = new SaaSStore();
    const handlers = createApiRouteHandlers(store);
    const tenant = store.createTenantWithSeed('QA Tenant Limits', 'qa-tenant-limits');

    const created = await handlers.handlePostInlineFinanceLine({
      tenantId: tenant.id,
      group: 'RECEITAS',
      name: 'Receita Limits',
    });
    const lineId = created.data.id;

    // 1. Mês menor que 1
    const resLow = await handlers.handlePatchFinanceCell({
      tenantId: tenant.id,
      lineId,
      month: 0,
      realized: 100,
    });
    assert.equal(resLow.status, 400);

    // 2. Mês maior que 12
    const resHigh = await handlers.handlePatchFinanceCell({
      tenantId: tenant.id,
      lineId,
      month: 13,
      realized: 100,
    });
    assert.equal(resHigh.status, 400);

    // 3. LineId inexistente
    const resNoLine = await handlers.handlePatchFinanceCell({
      tenantId: tenant.id,
      lineId: 'line-inexistente-123',
      month: 5,
      realized: 100,
    });
    assert.equal(resNoLine.status, 404);

    // 4. TenantId sem permissão ou inexistente
    const resNoTenant = await handlers.handlePatchFinanceCell({
      tenantId: 'tenant-fake',
      lineId,
      month: 5,
      realized: 100,
    });
    assert.equal(resNoTenant.status, 404);
  });

  test('QA-3: Atualizações dinâmicas via { field, value } e reflexo nos KPIs do DRE', async () => {
    const store = new SaaSStore();
    const handlers = createApiRouteHandlers(store);
    const tenant = store.createTenantWithSeed('QA DRE Test', 'qa-dre');

    // Cria receita
    const rec = await handlers.handlePostInlineFinanceLine({
      tenantId: tenant.id,
      group: 'RECEITAS',
      name: 'Consultoria Estratégica',
    });
    const recId = rec.data.id;

    // Atualiza realized via { field, value }
    const patchRec = await handlers.handlePatchFinanceCell({
      tenantId: tenant.id,
      lineId: recId,
      month: 1,
      field: 'realized',
      value: 12500.5,
    });
    assert.equal(patchRec.status, 200);
    assert.equal(patchRec.data.months[1].realized, 12500.5);
    assert.equal(patchRec.data.computed.totalRealized, 12500.5);

    // Atualiza target via { field, value }
    const patchTarget = await handlers.handlePatchFinanceCell({
      tenantId: tenant.id,
      lineId: recId,
      month: 1,
      field: 'target',
      value: 10000,
    });
    assert.equal(patchTarget.status, 200);
    assert.equal(patchTarget.data.months[1].target, 10000);
    assert.equal(patchTarget.data.computed.totalTarget, 10000);

    // Atualiza settledAt via { field, value }
    const patchSettled = await handlers.handlePatchFinanceCell({
      tenantId: tenant.id,
      lineId: recId,
      month: 1,
      field: 'settledAt',
      value: '2026-01-20',
    });
    assert.equal(patchSettled.status, 200);
    assert.equal(patchSettled.data.months[1].settledAt, '2026-01-20');
  });

  test('QA-4: Verificação independente da consolidação anual (Soma vs Último Saldo)', async () => {
    const store = new SaaSStore();
    const handlers = createApiRouteHandlers(store);
    const tenant = store.createTenantWithSeed('QA Consolidacao', 'qa-consolidacao');

    // 1. Grupo de Fluxo (Despesa Fixa): soma acumulada
    const fix = await handlers.handlePostInlineFinanceLine({
      tenantId: tenant.id,
      group: 'DESPESAS_FIXAS',
      name: 'Licença Software QA',
    });
    const fixId = fix.data.id;

    await handlers.handlePatchFinanceCell({ tenantId: tenant.id, lineId: fixId, month: 1, realized: 300 });
    await handlers.handlePatchFinanceCell({ tenantId: tenant.id, lineId: fixId, month: 2, realized: 300 });
    await handlers.handlePatchFinanceCell({ tenantId: tenant.id, lineId: fixId, month: 3, realized: 400 });
    const fixRes = await handlers.handlePatchFinanceCell({ tenantId: tenant.id, lineId: fixId, month: 4, realized: 500 });

    assert.equal(fixRes.data.computed.totalRealized, 1500, '300 + 300 + 400 + 500 = 1500');

    // 2. Grupo Patrimonial (Recursos Financeiros): último saldo
    const bank = await handlers.handlePostInlineFinanceLine({
      tenantId: tenant.id,
      group: 'RECURSOS_FINANCEIROS',
      name: 'Banco QA',
    });
    const bankId = bank.data.id;

    await handlers.handlePatchFinanceCell({ tenantId: tenant.id, lineId: bankId, month: 1, realized: 5000 });
    await handlers.handlePatchFinanceCell({ tenantId: tenant.id, lineId: bankId, month: 2, realized: 7500 });
    const bankRes = await handlers.handlePatchFinanceCell({ tenantId: tenant.id, lineId: bankId, month: 3, realized: 6200 });

    assert.equal(bankRes.data.computed.totalRealized, 6200, 'Em Recursos Financeiros deve ser o último saldo do mês 3');
  });

  test('QA-5: Isolamento multi-tenant estrito em operações inline', async () => {
    const store = new SaaSStore();
    const handlers = createApiRouteHandlers(store);
    const tenantA = store.createTenantWithSeed('Empresa Alfa', 'alfa');
    const tenantB = store.createTenantWithSeed('Empresa Beta', 'beta');

    const lineA = await handlers.handlePostInlineFinanceLine({
      tenantId: tenantA.id,
      group: 'RECEITAS',
      name: 'Receita Segura Alfa',
    });

    // Tentativa de invasão por Tenant Beta
    const invadePatch = await handlers.handlePatchFinanceCell({
      tenantId: tenantB.id,
      lineId: lineA.data.id,
      month: 1,
      realized: 999999,
    });
    assert.equal(invadePatch.status, 404, 'Tentativa de alteração com tenant diferente deve ser rejeitada');

    // Tentativa de exclusão cruzada
    const invadeDelete = await handlers.handleDeleteFinanceLine({
      tenantId: tenantB.id,
      lineId: lineA.data.id,
    });
    assert.equal(invadeDelete.status, 404, 'Tentativa de exclusão com tenant diferente deve ser rejeitada');
  });
});
