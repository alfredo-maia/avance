import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFinancialLine,
  computeMonthlyKPIs,
  round2,
} from '../../src/domain/finance-engine.ts';
import type { FinancialCategoryLine, FinancialGroup } from '../../src/domain/types.ts';

describe('Grade Inline 12 Meses — Regras de Cálculo e Consolidação Frontend (AV-106)', () => {
  const createMockLine = (
    id: string,
    group: FinancialGroup,
    profile: 'PF' | 'PJ',
    realizedPerMonth: Record<number, number>
  ): FinancialCategoryLine => {
    const months: any = {};
    for (let m = 1; m <= 12; m++) {
      months[m] = {
        month: m,
        realized: realizedPerMonth[m] || 0,
        target: 0,
        settledAt: null,
      };
    }
    return {
      id,
      tenantId: 'test-tenant',
      name: `Conta ${id}`,
      group,
      profile,
      months,
    };
  };

  test('AC-1 & AC-5: Grupos de Fluxo (RECEITAS, INVESTIMENTOS, DESPESAS_FIXAS, DESPESAS_VARIAVEIS) consolidam por soma acumulada', () => {
    const groups: FinancialGroup[] = ['RECEITAS', 'INVESTIMENTOS', 'DESPESAS_FIXAS', 'DESPESAS_VARIAVEIS'];

    for (const group of groups) {
      const line = createMockLine(`line-${group}`, group, 'PF', {
        1: 1500,
        2: 2500,
        3: 3500,
        12: 1000,
      });

      const computed = computeFinancialLine(line, 2026, 1, '2026-01-15');
      // Soma: 1500 + 2500 + 3500 + 1000 = 8500
      assert.equal(computed.totalRealized, 8500, `Grupo ${group} deve consolidar por soma acumulada (8500)`);
    }
  });

  test('AC-5: Grupo Patrimonial (RECURSOS_FINANCEIROS) consolida pelo ÚLTIMO SALDO INFORMADO no ano', () => {
    // Caso 1: Valores em Jan (10.000), Mar (25.000) e Ago (18.000)
    const line = createMockLine('bank-1', 'RECURSOS_FINANCEIROS', 'PJ', {
      1: 10000,
      3: 25000,
      8: 18000,
    });

    const computed = computeFinancialLine(line, 2026, 1, '2026-01-15');
    // Último mês com saldo é Agosto (18.000)
    assert.equal(computed.totalRealized, 18000, 'Consolidação deve ser o último saldo (18.000) e NÃO a soma (53.000)');
  });

  test('AC-5: Recálculo em tempo real do Resultado Operacional e Saldo Final DRE', () => {
    const recLine = createMockLine('rec-1', 'RECEITAS', 'PF', { 1: 12000 });
    const invLine = createMockLine('inv-1', 'INVESTIMENTOS', 'PF', { 1: 2000 });
    const fixLine = createMockLine('fix-1', 'DESPESAS_FIXAS', 'PF', { 1: 3000 });
    const varLine = createMockLine('var-1', 'DESPESAS_VARIAVEIS', 'PF', { 1: 1500 });

    const lines = [recLine, invLine, fixLine, varLine].map((l) =>
      computeFinancialLine(l, 2026, 1, '2026-01-15')
    );

    const kpis = computeMonthlyKPIs(lines, 2026, 1, '2026-01-15');

    // DRE = Receitas (12000) - Investimentos (2000) - Fixas (3000) - Variáveis (1500) = 5500
    assert.equal(kpis.monthRevenue, 12000);
    assert.equal(kpis.monthInvestments, 2000);
    assert.equal(kpis.monthFixedExpenses, 3000);
    assert.equal(kpis.monthVariableExpenses, 1500);
    assert.equal(kpis.monthFinalResult, 5500);
  });

  test('AC-6: Isolamento e consistência dos cálculos por titularidade PF vs PJ', () => {
    const bankPF = createMockLine('bank-pf', 'RECURSOS_FINANCEIROS', 'PF', { 1: 50000 });
    const bankPJ = createMockLine('bank-pj', 'RECURSOS_FINANCEIROS', 'PJ', { 1: 150000 });

    const lines = [bankPF, bankPJ].map((l) =>
      computeFinancialLine(l, 2026, 1, '2026-01-15')
    );

    const kpis = computeMonthlyKPIs(lines, 2026, 1, '2026-01-15');

    assert.equal(kpis.totalAssetsPF, 50000);
    assert.equal(kpis.totalAssetsPJ, 150000);
    assert.equal(kpis.totalAssetsLastBalance, 200000);
  });
});
