import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SaaSStore } from '../../src/server/saas-store.ts';
import { createApiRouteHandlers } from '../../src/app/api/v1/route-handlers.ts';
import type { FinancialGroup } from '../../src/domain/types.ts';

describe('Gestão e Contratos de Grade Inline (AV-105 / TDD Backend)', () => {
  let store: SaaSStore;
  let handlers: ReturnType<typeof createApiRouteHandlers>;
  let tenantId: string;

  beforeEach(() => {
    store = new SaaSStore();
    handlers = createApiRouteHandlers(store);
    const tenant = store.createTenantWithSeed('Empresa Grid TDD', 'empresa-grid', 'PRO');
    tenantId = tenant.id;
  });

  test('AC-1: handlePostInlineFinanceLine cria linha inline com 12 meses zerados', async () => {
    const res = await (handlers as any).handlePostInlineFinanceLine({
      tenantId,
      group: 'RECEITAS',
      name: 'Vendas Diretas',
      profile: 'PJ',
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.name, 'Vendas Diretas');
    assert.equal(res.data.group, 'RECEITAS');
    assert.equal(res.data.profile, 'PJ');
    assert.equal(Object.keys(res.data.months).length, 12);
    for (let m = 1; m <= 12; m++) {
      assert.equal(res.data.months[m].realized, 0);
      assert.equal(res.data.months[m].target, 0);
      assert.equal(res.data.months[m].settledAt, null);
    }
    assert.equal(res.data.computed.totalRealized, 0);
  });

  test('AC-1: handlePostInlineFinanceLine aceita nome vazio e aplica defaults', async () => {
    const res = await (handlers as any).handlePostInlineFinanceLine({
      tenantId,
      group: 'DESPESAS_FIXAS',
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.group, 'DESPESAS_FIXAS');
    assert.equal(res.data.profile, 'PF');
    assert.ok(typeof res.data.name === 'string');
    assert.equal(res.data.months[1].realized, 0);
  });

  test('AC-2: handlePatchFinanceCell atualiza mês específico e recalcula total acumulado e KPIs', async () => {
    const created = await (handlers as any).handlePostInlineFinanceLine({
      tenantId,
      group: 'RECEITAS',
      name: 'Receita Consultoria',
    });
    const lineId = created.data.id;

    const patchRes = await (handlers as any).handlePatchFinanceCell({
      tenantId,
      lineId,
      month: 4,
      realized: 8500,
      target: 8000,
      settledAt: '2026-04-10',
    });

    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.data.months[4].realized, 8500);
    assert.equal(patchRes.data.months[4].target, 8000);
    assert.equal(patchRes.data.months[4].settledAt, '2026-04-10');
    assert.equal(patchRes.data.computed.totalRealized, 8500);
    assert.ok(patchRes.data.kpis);
  });

  test('AC-3: handlePutFinanceLine atualiza metadados e preserva meses preenchidos', async () => {
    const created = await (handlers as any).handlePostInlineFinanceLine({
      tenantId,
      group: 'DESPESAS_VARIAVEIS',
      name: 'Combustível Frota',
    });
    const lineId = created.data.id;

    await (handlers as any).handlePatchFinanceCell({
      tenantId,
      lineId,
      month: 1,
      realized: 400,
    });

    const updateRes = await handlers.handlePutFinanceLine({
      tenantId,
      lineId,
      name: 'Combustível & Pedágios PJ',
      profile: 'PJ',
    });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.data.name, 'Combustível & Pedágios PJ');
    assert.equal(updateRes.data.profile, 'PJ');
    assert.equal(updateRes.data.months[1].realized, 400);
    assert.equal(updateRes.data.computed.totalRealized, 400);
  });

  test('AC-4: Regras de Consolidação Anual — Soma em Fluxos vs Último Saldo em Recursos', async () => {
    // 1. Fluxo (Soma)
    const recRes = await (handlers as any).handlePostInlineFinanceLine({
      tenantId,
      group: 'RECEITAS',
      name: 'SaaS Multi',
    });
    const recId = recRes.data.id;
    await (handlers as any).handlePatchFinanceCell({ tenantId, lineId: recId, month: 1, realized: 2000 });
    await (handlers as any).handlePatchFinanceCell({ tenantId, lineId: recId, month: 2, realized: 3000 });
    const recFinal = await (handlers as any).handlePatchFinanceCell({ tenantId, lineId: recId, month: 3, realized: 4000 });
    assert.equal(recFinal.data.computed.totalRealized, 9000); // 2000 + 3000 + 4000

    // 2. Recursos Financeiros (Último Saldo)
    const bankRes = await (handlers as any).handlePostInlineFinanceLine({
      tenantId,
      group: 'RECURSOS_FINANCEIROS',
      name: 'Itaú Empresas',
    });
    const bankId = bankRes.data.id;
    await (handlers as any).handlePatchFinanceCell({ tenantId, lineId: bankId, month: 1, realized: 10000 });
    await (handlers as any).handlePatchFinanceCell({ tenantId, lineId: bankId, month: 2, realized: 25000 });
    const bankFinal = await (handlers as any).handlePatchFinanceCell({ tenantId, lineId: bankId, month: 3, realized: 18000 });
    assert.equal(bankFinal.data.computed.totalRealized, 18000); // último saldo do mês 3
  });

  test('AC-5: Exclusão inline e validações de erro', async () => {
    const line = await (handlers as any).handlePostInlineFinanceLine({
      tenantId,
      group: 'INVESTIMENTOS',
      name: 'Tesouro IPCA+',
    });
    const lineId = line.data.id;

    const delRes = await handlers.handleDeleteFinanceLine({ tenantId, lineId });
    assert.equal(delRes.status, 200);

    const badPatch = await (handlers as any).handlePatchFinanceCell({
      tenantId,
      lineId,
      month: 1,
      realized: 500,
    });
    assert.equal(badPatch.status, 404);
  });
});
