import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { computeMultiYearGoal, computeGoalsSummary } from '../../src/domain/goals-engine.ts';
import type { MultiYearGoal, ExtraAchievement } from '../../src/domain/types.ts';

describe('Módulo 3: Propósitos e Metas (AC-10, AC-11)', () => {
  describe('AC-10: Situação e Dias Restantes', () => {
    test('meta realizada é sempre "Atingida"', () => {
      const goal: MultiYearGoal = {
        id: 'g-1',
        tenantId: 't-1',
        year: 2026,
        code: 'FIN-01',
        category: 'FINANCEIRA',
        title: 'Reserva de Emergência',
        deadline: '2026-12-31',
        targetAmount: 50000,
        realized: true,
      };

      const computed = computeMultiYearGoal(goal, '2026-06-30');
      assert.equal(computed.situation, 'Atingida');
    });

    test('meta sem prazo retorna "Sem prazo"', () => {
      const goal: MultiYearGoal = {
        id: 'g-2',
        tenantId: 't-1',
        year: 2026,
        code: 'DES-01',
        category: 'DESENVOLVIMENTO_PESSOAL',
        title: 'Aprender Rust',
        deadline: null,
        targetAmount: null,
        realized: false,
      };

      const computed = computeMultiYearGoal(goal, '2026-06-30');
      assert.equal(computed.situation, 'Sem prazo');
      assert.equal(computed.remainingDays, null);
    });

    test('meta vencida e não realizada retorna "Não atingida"', () => {
      const goal: MultiYearGoal = {
        id: 'g-3',
        tenantId: 't-1',
        year: 2026,
        code: 'SAU-01',
        category: 'FISICA_SAUDE',
        title: 'Maratona 10km',
        deadline: '2026-05-01',
        targetAmount: null,
        realized: false,
      };

      const computed = computeMultiYearGoal(goal, '2026-06-30');
      assert.equal(computed.situation, 'Não atingida');
    });

    test('meta dentro do prazo e não realizada retorna "Em andamento" com dias restantes', () => {
      const goal: MultiYearGoal = {
        id: 'g-4',
        tenantId: 't-1',
        year: 2026,
        code: 'DIV-01',
        category: 'DIVERSAO',
        title: 'Viagem Japão',
        deadline: '2026-07-10',
        targetAmount: 20000,
        realized: false,
      };

      // De 2026-06-30 a 2026-07-10 = 10 dias
      const computed = computeMultiYearGoal(goal, '2026-06-30');
      assert.equal(computed.situation, 'Em andamento');
      assert.equal(computed.remainingDays, 10);
    });
  });

  describe('AC-11: Painel Plurianual e Conquistas Extras', () => {
    test('consolida metas e conquistas extras no resumo do ano', () => {
      const goals: MultiYearGoal[] = [
        {
          id: 'g-1',
          tenantId: 't-1',
          year: 2026,
          code: 'FIN-01',
          category: 'FINANCEIRA',
          title: 'Reserva',
          deadline: '2026-12-31',
          targetAmount: 10000,
          realized: true,
        },
        {
          id: 'g-2',
          tenantId: 't-1',
          year: 2026,
          code: 'SAU-01',
          category: 'FISICA_SAUDE',
          title: 'Peso ideal',
          deadline: '2026-12-31',
          targetAmount: null,
          realized: false,
        },
      ];

      const extras: ExtraAchievement[] = [
        {
          id: 'ext-1',
          tenantId: 't-1',
          year: 2026,
          category: 'FINANCEIRA',
          title: 'Venda de Terreno Não Planejada',
          amount: 80000,
          realized: true,
        },
      ];

      const summary = computeGoalsSummary(goals, extras, 2026, '2026-06-30');

      assert.equal(summary.totalGoals, 2);
      assert.equal(summary.achievedGoals, 1);
      assert.equal(summary.inProgressGoals, 1);
      assert.equal(summary.achievementRate, 0.5);
      assert.equal(summary.extraAchievementsAmount, 80000);
      assert.equal(summary.extraAchievementsCount, 1);
      assert.equal(summary.byCategoryRate.FINANCEIRA, 1.0);
      assert.equal(summary.byCategoryRate.FISICA_SAUDE, 0);
    });
  });
});
