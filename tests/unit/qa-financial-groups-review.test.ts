import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { SaaSStore } from '../../src/server/saas-store.ts';
import { createApiRouteHandlers } from '../../src/app/api/v1/route-handlers.ts';
import { theme, validateMuiContrast } from '../../src/theme/theme.ts';

describe('QA Independente — Gestão dos Demais Grupos Financeiros (Ms. Sakura)', () => {
  test('QA-1: Integridade da criação dinâmica nos 4 grupos adicionais com metadados obrigatórios', async () => {
    const store = new SaaSStore();
    const handlers = createApiRouteHandlers(store);
    const tenant = store.createTenantWithSeed('QA Corp Test', 'qa-corp-test', 'ENTERPRISE');

    const groups = ['RECEITAS', 'INVESTIMENTOS', 'DESPESAS_FIXAS', 'DESPESAS_VARIAVEIS'] as const;
    for (const grp of groups) {
      const res = await handlers.handlePostFinanceLine({
        tenantId: tenant.id,
        name: `Conta Teste ${grp}`,
        profile: 'PJ',
        group: grp,
        subGroup: 'Subgrupo QA',
      });

      assert.equal(res.status, 201, `Criação em ${grp} deve responder com status 201`);
      assert.equal(res.data.group, grp);
      assert.equal(res.data.name, `Conta Teste ${grp}`);
      assert.equal(res.data.tenantId, tenant.id);
      assert.equal(Object.keys(res.data.months).length, 12, 'Deve inicializar todos os 12 meses');
    }
  });

  test('QA-2: Aderência rigorosa à regra de soma acumulada dos 12 meses para grupos de fluxo vs último saldo para recursos', () => {
    const store = new SaaSStore();
    const tenant = store.createTenantWithSeed('QA Balances Test', 'qa-balances');

    // 1. Recurso Financeiro: mês 1 = 1000, mês 2 = 2500 -> totalRealized DEVE ser 2500 (último saldo)
    const resLine = store.createFinancialLine(tenant.id, {
      name: 'Conta Corrente QA',
      profile: 'PF',
      group: 'RECURSOS_FINANCEIROS',
      months: {
        1: { realized: 1000 },
        2: { realized: 2500 },
      },
    });

    // 2. Receita: mês 1 = 1000, mês 2 = 2500 -> totalRealized DEVE ser 3500 (soma acumulada)
    const recLine = store.createFinancialLine(tenant.id, {
      name: 'Receita Consultoria QA',
      profile: 'PF',
      group: 'RECEITAS',
      months: {
        1: { realized: 1000 },
        2: { realized: 2500 },
      },
    });

    const dash = store.getDashboard(tenant.id, 2026, 2, '2026-02-15');
    const computedRes = dash.finance.lines.find((l) => l.id === resLine.id);
    const computedRec = dash.finance.lines.find((l) => l.id === recLine.id);

    assert.equal(computedRes?.totalRealized, 2500, 'Recursos Financeiros deve usar regra do Último Saldo');
    assert.equal(computedRec?.totalRealized, 3500, 'Grupos de Fluxo (Receitas) deve usar soma acumulada dos 12 meses');
  });

  test('QA-3: Recálculo determinístico em tempo real do Resultado Operacional e DRE', () => {
    const store = new SaaSStore();
    const tenant = store.createTenantWithSeed('QA DRE Test', 'qa-dre');

    // Receita de 10.000 em Jan
    store.createFinancialLine(tenant.id, {
      name: 'Receita Operacional',
      group: 'RECEITAS',
      months: { 1: { realized: 10000, target: 10000, settledAt: '2026-01-10' } },
    });

    // Despesa Fixa de 3.000 em Jan
    store.createFinancialLine(tenant.id, {
      name: 'Aluguel Comercial',
      group: 'DESPESAS_FIXAS',
      months: { 1: { realized: 3000, target: 3000, settledAt: '2026-01-10' } },
    });

    // Despesa Variável de 1.000 em Jan
    store.createFinancialLine(tenant.id, {
      name: 'Serviços Nuvem',
      group: 'DESPESAS_VARIAVEIS',
      months: { 1: { realized: 1000, target: 1000, settledAt: '2026-01-10' } },
    });

    // Investimento de 2.000 em Jan
    store.createFinancialLine(tenant.id, {
      name: 'Aporte CDB',
      group: 'INVESTIMENTOS',
      months: { 1: { realized: 2000, target: 2000, settledAt: '2026-01-10' } },
    });

    const dash = store.getDashboard(tenant.id, 2026, 1, '2026-01-15');
    // Resultado Final do Mês = 10000 (Receitas) - 3000 (Fixas) - 1000 (Variáveis) - 2000 (Investimentos) = 4000
    assert.equal(dash.finance.kpis.monthRevenue, 10000);
    assert.equal(dash.finance.kpis.monthFixedExpenses, 3000);
    assert.equal(dash.finance.kpis.monthVariableExpenses, 1000);
    assert.equal(dash.finance.kpis.monthInvestments, 2000);
    assert.equal(dash.finance.kpis.monthFinalResult, 4000);
  });

  test('QA-4: Exclusão atômica sem vazamento de estado e sem mutação de vizinhos', async () => {
    const store = new SaaSStore();
    const handlers = createApiRouteHandlers(store);
    const tenantA = store.createTenantWithSeed('QA Tenant A', 'tenant-a');
    const tenantB = store.createTenantWithSeed('QA Tenant B', 'tenant-b');

    const lineA = store.createFinancialLine(tenantA.id, {
      name: 'Receita Segura A',
      group: 'RECEITAS',
    });
    const lineB = store.createFinancialLine(tenantB.id, {
      name: 'Receita Segura B',
      group: 'RECEITAS',
    });

    // Exclusão bem-sucedida em tenantA
    const delRes = await handlers.handleDeleteFinanceLine({
      tenantId: tenantA.id,
      lineId: lineA.id,
    });
    assert.equal(delRes.status, 200);

    // Tenant B continua intacto
    const dashB = store.getDashboard(tenantB.id);
    assert.ok(dashB.finance.lines.some((l) => l.id === lineB.id), 'Linha de Tenant B não pode ser afetada');
  });

  test('QA-5: Conformidade visual e contraste Material UI nos botões de ação e tabelas', () => {
    assert.strictEqual(theme.palette.primary.main, '#2563eb');
    assert.strictEqual(theme.palette.error.main, '#dc2626');

    // Botões de perigo e primários devem atender contraste
    assert.strictEqual(validateMuiContrast('#ffffff', theme.palette.primary.main), true, 'Botão Primário deve ter contraste legível');
    assert.strictEqual(validateMuiContrast('#ffffff', theme.palette.error.main), true, 'Botão Danger deve ter contraste legível');
  });
});
