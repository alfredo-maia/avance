import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SaaSStore } from '../../src/server/saas-store.ts';
import { createApiRouteHandlers } from '../../src/app/api/v1/route-handlers.ts';

describe('Gestão Completa dos Demais Grupos Financeiros (AV-101 / Fase 1 / AC-1 a AC-5)', () => {
  let store: SaaSStore;
  let handlers: ReturnType<typeof createApiRouteHandlers>;
  let tenantId: string;

  beforeEach(() => {
    store = new SaaSStore();
    handlers = createApiRouteHandlers(store);
    const tenant = store.createTenantWithSeed('Finanças Corporativas', 'financas-corp', 'PRO');
    tenantId = tenant.id;
  });

  test('AC-1: Criação dinâmica de novas linhas nos 4 grupos (RECEITAS, INVESTIMENTOS, DESPESAS_FIXAS, DESPESAS_VARIAVEIS)', async () => {
    // 1. RECEITAS via store
    const lineReceita = store.createFinancialLine(tenantId, {
      name: 'Consultoria Estratégica PJ',
      profile: 'PJ',
      group: 'RECEITAS',
      subGroup: 'Serviços Especializados',
    });
    assert.ok(lineReceita.id);
    assert.equal(lineReceita.name, 'Consultoria Estratégica PJ');
    assert.equal(lineReceita.group, 'RECEITAS');
    assert.equal(lineReceita.profile, 'PJ');
    assert.equal(lineReceita.subGroup, 'Serviços Especializados');
    assert.equal(Object.keys(lineReceita.months).length, 12);

    // 2. INVESTIMENTOS via API Handler
    const apiResInv = await handlers.handlePostFinanceLine({
      tenantId,
      name: 'Aporte CDB Pré-Fixado 13% a.a.',
      profile: 'PF',
      group: 'INVESTIMENTOS',
      subGroup: 'Renda Fixa',
    });
    assert.equal(apiResInv.status, 201);
    assert.equal(apiResInv.data.group, 'INVESTIMENTOS');
    assert.equal(apiResInv.data.name, 'Aporte CDB Pré-Fixado 13% a.a.');

    // 3. DESPESAS_FIXAS via API Handler
    const apiResFix = await handlers.handlePostFinanceLine({
      tenantId,
      name: 'Licença Software ERP Cloud',
      profile: 'PJ',
      group: 'DESPESAS_FIXAS',
      subGroup: 'Infraestrutura',
      dueDay: 10,
    });
    assert.equal(apiResFix.status, 201);
    assert.equal(apiResFix.data.group, 'DESPESAS_FIXAS');
    assert.equal(apiResFix.data.dueDay, 10);

    // 4. DESPESAS_VARIAVEIS via API Handler
    const apiResVar = await handlers.handlePostFinanceLine({
      tenantId,
      name: 'Combustível & Transporte Viagens',
      profile: 'PF',
      group: 'DESPESAS_VARIAVEIS',
      subGroup: 'Transporte',
    });
    assert.equal(apiResVar.status, 201);
    assert.equal(apiResVar.data.group, 'DESPESAS_VARIAVEIS');
    assert.equal(apiResVar.data.profile, 'PF');
  });

  test('AC-2: Edição inline de metadados e valores mensais (Jan a Dez)', async () => {
    const line = store.createFinancialLine(tenantId, {
      name: 'Despesa Provisória',
      profile: 'PF',
      group: 'DESPESAS_FIXAS',
    });

    // Edição via API Handler (metadados e meses Jan, Fev, Mar)
    const apiRes = await handlers.handlePutFinanceLine({
      tenantId,
      lineId: line.id,
      name: 'Aluguel Escritório Central',
      profile: 'PJ',
      subGroup: 'Instalações',
      months: {
        1: { realized: 3500, target: 3500 },
        2: { realized: 3500, target: 3500 },
        3: { realized: 3800, target: 3500 },
      },
    });

    assert.equal(apiRes.status, 200);
    assert.equal(apiRes.data.name, 'Aluguel Escritório Central');
    assert.equal(apiRes.data.profile, 'PJ');
    assert.equal(apiRes.data.subGroup, 'Instalações');
    assert.equal(apiRes.data.months[1].realized, 3500);
    assert.equal(apiRes.data.months[2].realized, 3500);
    assert.equal(apiRes.data.months[3].realized, 3800);
  });

  test('AC-3: Regras de Consolidação Anual (Soma dos 12 meses) e DRE em tempo real', async () => {
    // Criação de Receita com valores nos meses 1, 2 e 3
    const recLine = store.createFinancialLine(tenantId, {
      name: 'Contratos Mensais SaaS',
      profile: 'PJ',
      group: 'RECEITAS',
      months: {
        1: { realized: 20000, target: 20000, settledAt: '2026-01-05' },
        2: { realized: 25000, target: 20000, settledAt: '2026-02-05' },
        3: { realized: 30000, target: 20000, settledAt: '2026-03-05' },
      },
    });

    // Criação de Despesa Fixa
    const fixLine = store.createFinancialLine(tenantId, {
      name: 'Folha de Pagamento',
      profile: 'PJ',
      group: 'DESPESAS_FIXAS',
      months: {
        1: { realized: 8000, target: 8000, settledAt: '2026-01-05' },
        2: { realized: 8000, target: 8000, settledAt: '2026-02-05' },
        3: { realized: 9000, target: 8000, settledAt: '2026-03-05' },
      },
    });

    // Criação de Investimento
    const invLine = store.createFinancialLine(tenantId, {
      name: 'Aporte Tesouro Direto',
      profile: 'PF',
      group: 'INVESTIMENTOS',
      months: {
        1: { realized: 3000, target: 3000, settledAt: '2026-01-10' },
        2: { realized: 4000, target: 3000, settledAt: '2026-02-10' },
        3: { realized: 5000, target: 3000, settledAt: '2026-03-10' },
      },
    });

    // Dashboard para o mês 3
    const dash = store.getDashboard(tenantId, 2026, 3, '2026-03-15');

    // 1. Consolidação Anual: soma de Jan..Dez
    const computedRec = dash.finance.lines.find((l) => l.id === recLine.id);
    const computedFix = dash.finance.lines.find((l) => l.id === fixLine.id);
    const computedInv = dash.finance.lines.find((l) => l.id === invLine.id);

    assert.ok(computedRec);
    assert.ok(computedFix);
    assert.ok(computedInv);

    // Soma dos 12 meses:
    assert.equal(computedRec.totalRealized, 75000); // 20000 + 25000 + 30000
    assert.equal(computedFix.totalRealized, 25000); // 8000 + 8000 + 9000
    assert.equal(computedInv.totalRealized, 12000); // 3000 + 4000 + 5000

    // 2. DRE / Resultado do Mês 3:
    // Receitas do mês 3: 30.000
    // Despesas fixas do mês 3: 9.000
    // Investimentos do mês 3: 5.000
    // Resultado Final do Mês 3 = 30000 - 9000 - 5000 = 16000 (mais/menos o seed de template)
    assert.ok(dash.finance.kpis.monthRevenue >= 30000);
    assert.ok(dash.finance.kpis.monthInvestments >= 5000);
    assert.ok(dash.finance.kpis.monthFixedExpenses >= 9000);

    // 3. Resultado Acumulado Ano reflete a evolução de todos os meses
    assert.ok(dash.finance.kpis.accumulatedResultYear > 0);
  });

  test('AC-4: Exclusão de linhas com atualização imediata e impacto no resultado', async () => {
    // Adiciona uma receita extraordinária
    const extraRec = store.createFinancialLine(tenantId, {
      name: 'Receita Eventual de Consultoria',
      profile: 'PJ',
      group: 'RECEITAS',
      months: {
        1: { realized: 50000, target: 50000, settledAt: '2026-01-10' },
      },
    });

    const dashBefore = store.getDashboard(tenantId, 2026, 1, '2026-01-15');
    const revBefore = dashBefore.finance.kpis.monthRevenue;
    const resultBefore = dashBefore.finance.kpis.monthFinalResult;

    // Exclusão via API
    const delRes = await handlers.handleDeleteFinanceLine({
      tenantId,
      lineId: extraRec.id,
    });
    assert.equal(delRes.status, 200);

    // Linha não existe mais no dashboard
    const dashAfter = store.getDashboard(tenantId, 2026, 1, '2026-01-15');
    assert.ok(!dashAfter.finance.lines.some((l) => l.id === extraRec.id));
    assert.equal(dashAfter.finance.kpis.monthRevenue, revBefore - 50000);
    assert.equal(dashAfter.finance.kpis.monthFinalResult, resultBefore - 50000);
  });

  test('AC-5: Validação de contratos, schema e isolamento multi-tenant estrito', async () => {
    const otherTenant = store.createTenantWithSeed('Outra Corp', 'outra-corp');

    const line = store.createFinancialLine(tenantId, {
      name: 'Receita Segura Corp 1',
      profile: 'PJ',
      group: 'RECEITAS',
    });

    // Erro ao tentar criar linha sem nome ou tenant
    const badPost = await handlers.handlePostFinanceLine({
      tenantId,
      name: '',
      group: 'RECEITAS',
    });
    assert.equal(badPost.status, 400);

    // Erro ao atualizar linha de outro tenant
    const crossUpdate = await handlers.handlePutFinanceLine({
      tenantId: otherTenant.id,
      lineId: line.id,
      name: 'Invasão',
    });
    assert.equal(crossUpdate.status, 404);

    // Erro ao excluir linha de outro tenant
    const crossDelete = await handlers.handleDeleteFinanceLine({
      tenantId: otherTenant.id,
      lineId: line.id,
    });
    assert.equal(crossDelete.status, 404);
  });
});
