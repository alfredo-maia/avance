import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeSettlementStatus,
  computeGoalStatus,
  computeFinancialLine,
  computeMonthlyKPIs,
} from '../../src/domain/finance-engine.ts';
import type { FinancialCategoryLine } from '../../src/domain/types.ts';

describe('Módulo 1: Controle Finanças (AC-3, AC-4, AC-5)', () => {
  describe('AC-3: Regra do Último Saldo Informado em RECURSOS_FINANCEIROS', () => {
    test('totalRealized reflete exatamente o último mês com saldo realizado > 0', () => {
      const line: FinancialCategoryLine = {
        id: 'acc-bb',
        tenantId: 'tenant-1',
        group: 'RECURSOS_FINANCEIROS',
        name: 'Banco do Brasil Corrente',
        profile: 'PF',
        months: {
          1: { month: 1, realized: 1000, target: 1000, settledAt: '2026-01-31' },
          2: { month: 2, realized: 1500, target: 1200, settledAt: '2026-02-28' },
          3: { month: 3, realized: 2300, target: 1500, settledAt: '2026-03-31' },
          4: { month: 4, realized: 0, target: 2000, settledAt: null },
          5: { month: 5, realized: 0, target: 2000, settledAt: null },
          6: { month: 6, realized: 0, target: 2000, settledAt: null },
          7: { month: 7, realized: 0, target: 2000, settledAt: null },
          8: { month: 8, realized: 0, target: 2000, settledAt: null },
          9: { month: 9, realized: 0, target: 2000, settledAt: null },
          10: { month: 10, realized: 0, target: 2000, settledAt: null },
          11: { month: 11, realized: 0, target: 2000, settledAt: null },
          12: { month: 12, realized: 0, target: 2000, settledAt: null },
        },
      };

      const computed = computeFinancialLine(line, 2026, 3, '2026-03-31');
      // O último mês com saldo > 0 é o mês 3 (2300). Não deve somar 1000 + 1500 + 2300 = 4800!
      assert.equal(computed.totalRealized, 2300);
    });

    test('para outros grupos como RECEITAS e DESPESAS, totalRealized é a soma de Jan..Dez', () => {
      const line: FinancialCategoryLine = {
        id: 'rec-salario',
        tenantId: 'tenant-1',
        group: 'RECEITAS',
        name: 'Salário Holerite',
        profile: 'PF',
        months: {
          1: { month: 1, realized: 5000, target: 5000, settledAt: '2026-01-05' },
          2: { month: 2, realized: 5000, target: 5000, settledAt: '2026-02-05' },
          3: { month: 3, realized: 6000, target: 5000, settledAt: '2026-03-05' },
          4: { month: 4, realized: 0, target: 5000, settledAt: null },
          5: { month: 5, realized: 0, target: 5000, settledAt: null },
          6: { month: 6, realized: 0, target: 5000, settledAt: null },
          7: { month: 7, realized: 0, target: 5000, settledAt: null },
          8: { month: 8, realized: 0, target: 5000, settledAt: null },
          9: { month: 9, realized: 0, target: 5000, settledAt: null },
          10: { month: 10, realized: 0, target: 5000, settledAt: null },
          11: { month: 11, realized: 0, target: 5000, settledAt: null },
          12: { month: 12, realized: 0, target: 5000, settledAt: null },
        },
      };

      const computed = computeFinancialLine(line, 2026, 3, '2026-03-31');
      assert.equal(computed.totalRealized, 16000);
    });
  });

  describe('AC-4: Motor Determinístico de Status', () => {
    test('retorna "—" quando realized e target são 0', () => {
      const status = computeSettlementStatus('DESPESAS_FIXAS', 0, 0, null, 10, 2026, 4, '2026-04-15');
      assert.equal(status, '—');
    });

    test('retorna "✔ Recebido" para RECEITAS com settledAt preenchido', () => {
      const status = computeSettlementStatus('RECEITAS', 5000, 5000, '2026-04-05', 5, 2026, 4, '2026-04-15');
      assert.equal(status, '✔ Recebido');
    });

    test('retorna "✔ Pago" para DESPESAS com settledAt preenchido', () => {
      const status = computeSettlementStatus('DESPESAS_FIXAS', 200, 200, '2026-04-10', 10, 2026, 4, '2026-04-15');
      assert.equal(status, '✔ Pago');
    });

    test('retorna "⚠ Atrasado" quando não liquidado e dueDate < referenceDate', () => {
      // dueDay 10 de abril de 2026 e referência 15 de abril de 2026
      const status = computeSettlementStatus('DESPESAS_FIXAS', 0, 200, null, 10, 2026, 4, '2026-04-15');
      assert.equal(status, '⚠ Atrasado');
    });

    test('retorna "⏳ A pagar" quando não liquidado e dueDate >= referenceDate', () => {
      // dueDay 20 de abril de 2026 e referência 15 de abril de 2026
      const status = computeSettlementStatus('DESPESAS_FIXAS', 0, 200, null, 20, 2026, 4, '2026-04-15');
      assert.equal(status, '⏳ A pagar');
    });

    test('retorna "⏳ A receber" para RECEITAS não liquidadas no prazo', () => {
      const status = computeSettlementStatus('RECEITAS', 0, 1000, null, 25, 2026, 4, '2026-04-15');
      assert.equal(status, '⏳ A receber');
    });

    test('avalia GoalStatus corretamente para receitas e despesas', () => {
      assert.equal(computeGoalStatus('RECEITAS', 5000, 4000), 'bateu meta');
      assert.equal(computeGoalStatus('RECEITAS', 3000, 4000), 'não bateu meta');
      assert.equal(computeGoalStatus('RECEITAS', 0, 0), 'sem meta');

      // Em despesas, gastar <= target é que bate meta!
      assert.equal(computeGoalStatus('DESPESAS_FIXAS', 400, 500), 'bateu meta');
      assert.equal(computeGoalStatus('DESPESAS_FIXAS', 600, 500), 'não bateu meta');
    });
  });

  describe('AC-5: KPIs Mensais e Resumo', () => {
    test('calcula KPIs mensais e acumulados de forma determinística', () => {
      const lines: FinancialCategoryLine[] = [
        {
          id: 'acc-1',
          tenantId: 'tenant-1',
          group: 'RECURSOS_FINANCEIROS',
          name: 'BB',
          profile: 'PF',
          months: { 1: { month: 1, realized: 10000, target: 10000, settledAt: '2026-01-31' } },
        },
        {
          id: 'acc-2',
          tenantId: 'tenant-1',
          group: 'RECURSOS_FINANCEIROS',
          name: 'Nubank PJ',
          profile: 'PJ',
          months: { 1: { month: 1, realized: 5000, target: 5000, settledAt: '2026-01-31' } },
        },
        {
          id: 'rec-1',
          tenantId: 'tenant-1',
          group: 'RECEITAS',
          subGroup: 'Rendimento Social',
          name: 'Salário',
          profile: 'PF',
          months: { 1: { month: 1, realized: 10000, target: 10000, settledAt: '2026-01-05' } },
        },
        {
          id: 'rec-2',
          tenantId: 'tenant-1',
          group: 'RECEITAS',
          subGroup: 'Outras Receitas',
          name: 'Extra',
          profile: 'PF',
          months: { 1: { month: 1, realized: 0, target: 2000, settledAt: null } },
          dueDay: 20,
        },
        {
          id: 'inv-1',
          tenantId: 'tenant-1',
          group: 'INVESTIMENTOS',
          name: 'CDB',
          profile: 'PF',
          months: { 1: { month: 1, realized: 2000, target: 2000, settledAt: '2026-01-10' } },
        },
        {
          id: 'fix-1',
          tenantId: 'tenant-1',
          group: 'DESPESAS_FIXAS',
          name: 'Condomínio',
          profile: 'PF',
          months: { 1: { month: 1, realized: 1000, target: 1000, settledAt: '2026-01-10' } },
        },
        {
          id: 'var-1',
          tenantId: 'tenant-1',
          group: 'DESPESAS_VARIAVEIS',
          name: 'Luz',
          profile: 'PF',
          months: { 1: { month: 1, realized: 0, target: 500, settledAt: null } },
          dueDay: 5,
        },
      ];

      const computedLines = lines.map((l) => computeFinancialLine(l, 2026, 1, '2026-01-15'));
      const kpis = computeMonthlyKPIs(computedLines, 2026, 1, '2026-01-15');

      assert.equal(kpis.monthRevenue, 10000);
      assert.equal(kpis.monthSocialRevenue, 10000);
      assert.equal(kpis.receivedInMonth, 10000);
      assert.equal(kpis.toReceiveInMonth, 2000);
      assert.equal(kpis.monthInvestments, 2000);
      assert.equal(kpis.monthFixedExpenses, 1000);
      assert.equal(kpis.paidInMonth, 3000); // 2000 inv + 1000 fix
      assert.equal(kpis.overdueCount, 1); // Luz venceu dia 5 e ref é dia 15
      assert.equal(kpis.overdueAmount, 500);

      // monthFinalResult = Revenue - Investments - Fixed - Variable = 10000 - 2000 - 1000 - 0 = 7000
      assert.equal(kpis.monthFinalResult, 7000);
      assert.equal(kpis.investmentRate, 0.2); // 2000 / 10000
      assert.equal(kpis.totalAssetsLastBalance, 15000);
      assert.equal(kpis.totalAssetsPF, 10000);
      assert.equal(kpis.totalAssetsPJ, 5000);
    });
  });
});
