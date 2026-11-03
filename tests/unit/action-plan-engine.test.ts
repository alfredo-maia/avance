import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeActionPlanIndicator,
  syncFinanceToActionPlan,
} from '../../src/domain/action-plan-engine.ts';
import type { ActionPlanIndicator, ComputedFinancialLine } from '../../src/domain/types.ts';

describe('Módulo 4: Plano de Ação das Metas (AC-12, AC-13, AC-14)', () => {
  describe('AC-12 & AC-13: Regras de Cálculo dos 4 Tipos de Indicadores', () => {
    test('tipo SOMA: soma anual de realizado / soma anual de planejado', () => {
      const ind: ActionPlanIndicator = {
        id: 'ind-1',
        tenantId: 't-1',
        goalId: 'g-1',
        year: 2026,
        name: 'Aportes Mensais',
        deadline: '2026-12-31',
        targetValue: 12000,
        completed: false,
        trackingType: 'SOMA',
        months: {
          1: { month: 1, plannedValue: 1000, realizedValue: 1200 },
          2: { month: 2, plannedValue: 1000, realizedValue: 800 },
        },
      };

      const computed = computeActionPlanIndicator(ind, '2026-06-30');
      assert.equal(computed.totalOrLastPlanned, 2000);
      assert.equal(computed.totalOrLastRealized, 2000);
      assert.equal(computed.achievementRatio, 1);
      assert.equal(computed.situation, 'No alvo');
    });

    test('tipo LIMITE_MAXIMO: meses dentro do teto / meses com realizado', () => {
      const ind: ActionPlanIndicator = {
        id: 'ind-2',
        tenantId: 't-1',
        goalId: 'g-2',
        year: 2026,
        name: 'Teto de Gastos Cartão',
        deadline: '2026-12-31',
        targetValue: 2000,
        completed: false,
        trackingType: 'LIMITE_MAXIMO',
        months: {
          1: { month: 1, plannedValue: 2000, realizedValue: 1800 }, // OK
          2: { month: 2, plannedValue: 2000, realizedValue: 2500 }, // Estourou
          3: { month: 3, plannedValue: 2000, realizedValue: 1900 }, // OK
        },
      };

      const computed = computeActionPlanIndicator(ind, '2026-06-30');
      // 2 meses dentro de 3 realizados = 2/3 ~ 0.67
      assert.equal(computed.achievementRatio, 0.67);
      assert.equal(computed.situation, 'Em andamento');
    });

    test('tipo ULTIMO_VALOR_REDUZIR: clamp((Plano_Inicial - Ultimo_Realizado) / (Plano_Inicial - Meta_Indicador), 0, 1)', () => {
      // Plano inicial = 90kg, Meta = 80kg (reduzir 10kg)
      // Último realizado = 85kg -> reduziu 5kg -> 5/10 = 50%
      const ind: ActionPlanIndicator = {
        id: 'ind-3',
        tenantId: 't-1',
        goalId: 'g-3',
        year: 2026,
        name: 'Redução de Peso Corporal',
        deadline: '2026-12-31',
        targetValue: 80, // Meta
        completed: false,
        trackingType: 'ULTIMO_VALOR_REDUZIR',
        months: {
          1: { month: 1, plannedValue: 90, realizedValue: 90 },
          2: { month: 2, plannedValue: 88, realizedValue: 87 },
          3: { month: 3, plannedValue: 86, realizedValue: 85 },
        },
      };

      const computed = computeActionPlanIndicator(ind, '2026-06-30');
      assert.equal(computed.totalOrLastRealized, 85);
      assert.equal(computed.achievementRatio, 0.5);
    });

    test('tipo MARCO_TEXTO e conclusão explícita', () => {
      const ind: ActionPlanIndicator = {
        id: 'ind-4',
        tenantId: 't-1',
        goalId: 'g-4',
        year: 2026,
        name: 'Publicação do Livro',
        deadline: '2026-05-01',
        targetValue: null,
        completed: true,
        trackingType: 'MARCO_TEXTO',
        months: {
          1: { month: 1, plannedValue: null, realizedValue: null, plannedText: 'Esboço', realizedText: 'Esboço OK' },
        },
      };

      const computed = computeActionPlanIndicator(ind, '2026-06-30');
      assert.equal(computed.situation, 'Concluída');
    });

    test('indicador vencido e não concluído retorna "Não atingido"', () => {
      const ind: ActionPlanIndicator = {
        id: 'ind-5',
        tenantId: 't-1',
        goalId: 'g-5',
        year: 2026,
        name: 'Certificação AWS',
        deadline: '2026-04-01',
        targetValue: 1,
        completed: false,
        trackingType: 'SOMA',
        months: {
          1: { month: 1, plannedValue: 1, realizedValue: 0 },
        },
      };

      const computed = computeActionPlanIndicator(ind, '2026-06-30');
      assert.equal(computed.situation, 'Não atingido');
    });
  });

  describe('AC-14: Vínculo Estruturado Controle Finanças -> Plano de Ação', () => {
    test('sincroniza realizado da linha financeira vinculada sem erros #REF!', () => {
      const indicators: ActionPlanIndicator[] = [
        {
          id: 'ind-fin',
          tenantId: 't-1',
          goalId: 'g-fin',
          year: 2026,
          name: 'Aportes CDB',
          deadline: '2026-12-31',
          targetValue: 12000,
          completed: false,
          trackingType: 'SOMA',
          linkedFinanceCategoryId: 'cat-cdb',
          months: {
            1: { month: 1, plannedValue: 1000, realizedValue: null },
            2: { month: 2, plannedValue: 1000, realizedValue: null },
          },
        },
      ];

      const sampleLines: ComputedFinancialLine[] = [
        {
          id: 'cat-cdb',
          tenantId: 't-1',
          group: 'INVESTIMENTOS',
          name: 'Poupança/CDB',
          profile: 'PF',
          totalRealized: 2500,
          totalTarget: 2000,
          monthlyAverage: 1250,
          realMinusTarget: 500,
          alreadySettledYear: 2500,
          pendingYear: 0,
          referenceMonthStatus: '✔ Pago',
          referenceMonthGoalStatus: 'bateu meta',
          referenceMonthValue: 1500,
          months: {
            1: { month: 1, realized: 1000, target: 1000, settledAt: '2026-01-10' },
            2: { month: 2, realized: 1500, target: 1000, settledAt: '2026-02-10' },
          },
        },
      ];

      const synced = syncFinanceToActionPlan(indicators, sampleLines);
      assert.equal(synced[0].months[1].realizedValue, 1000);
      assert.equal(synced[0].months[2].realizedValue, 1500);
    });
  });
});
