/**
 * Motor de Propósitos e Metas (AC-10, AC-11)
 * Gestão plurianual, cálculo de situação e dias restantes e consolidação de conquistas extras.
 */

import { round2 } from './finance-engine.ts';
import type {
  MultiYearGoal,
  ComputedMultiYearGoal,
  ExtraAchievement,
  YearGoalsSummary,
  GoalCategory,
} from './types.ts';

export function computeMultiYearGoal(
  goal: MultiYearGoal,
  referenceDateStr: string
): ComputedMultiYearGoal {
  if (goal.realized) {
    return {
      ...goal,
      situation: 'Atingida',
      remainingDays: 0,
    };
  }

  if (!goal.deadline || goal.deadline.trim() === '') {
    return {
      ...goal,
      situation: 'Sem prazo',
      remainingDays: null,
    };
  }

  if (referenceDateStr > goal.deadline) {
    return {
      ...goal,
      situation: 'Não atingida',
      remainingDays: 0,
    };
  }

  const refTime = new Date(`${referenceDateStr}T00:00:00Z`).getTime();
  const deadlineTime = new Date(`${goal.deadline}T00:00:00Z`).getTime();
  const diffDays = Math.ceil((deadlineTime - refTime) / (1000 * 60 * 60 * 24));

  return {
    ...goal,
    situation: 'Em andamento',
    remainingDays: Math.max(0, diffDays),
  };
}

export function computeGoalsSummary(
  goals: MultiYearGoal[],
  extraAchievements: ExtraAchievement[],
  year: number,
  referenceDateStr: string
): YearGoalsSummary {
  const yearGoals = goals.filter((g) => g.year === year);
  const computedGoals = yearGoals.map((g) => computeMultiYearGoal(g, referenceDateStr));

  let achievedGoals = 0;
  let notAchievedGoals = 0;
  let inProgressGoals = 0;
  let noDeadlineGoals = 0;

  const categoryStats: Record<GoalCategory, { total: number; achieved: number }> = {
    FINANCEIRA: { total: 0, achieved: 0 },
    DESENVOLVIMENTO_PESSOAL: { total: 0, achieved: 0 },
    FISICA_SAUDE: { total: 0, achieved: 0 },
    DIVERSAO: { total: 0, achieved: 0 },
  };

  for (const cg of computedGoals) {
    if (categoryStats[cg.category]) {
      categoryStats[cg.category].total += 1;
      if (cg.situation === 'Atingida') {
        categoryStats[cg.category].achieved += 1;
      }
    }

    if (cg.situation === 'Atingida') achievedGoals += 1;
    else if (cg.situation === 'Não atingida') notAchievedGoals += 1;
    else if (cg.situation === 'Em andamento') inProgressGoals += 1;
    else if (cg.situation === 'Sem prazo') noDeadlineGoals += 1;
  }

  const totalGoals = computedGoals.length;
  const achievementRate = totalGoals > 0 ? round2(achievedGoals / totalGoals) : 0;

  const byCategoryRate: Record<GoalCategory, number> = {
    FINANCEIRA:
      categoryStats.FINANCEIRA.total > 0
        ? round2(categoryStats.FINANCEIRA.achieved / categoryStats.FINANCEIRA.total)
        : 0,
    DESENVOLVIMENTO_PESSOAL:
      categoryStats.DESENVOLVIMENTO_PESSOAL.total > 0
        ? round2(
            categoryStats.DESENVOLVIMENTO_PESSOAL.achieved /
              categoryStats.DESENVOLVIMENTO_PESSOAL.total
          )
        : 0,
    FISICA_SAUDE:
      categoryStats.FISICA_SAUDE.total > 0
        ? round2(categoryStats.FISICA_SAUDE.achieved / categoryStats.FISICA_SAUDE.total)
        : 0,
    DIVERSAO:
      categoryStats.DIVERSAO.total > 0
        ? round2(categoryStats.DIVERSAO.achieved / categoryStats.DIVERSAO.total)
        : 0,
  };

  const yearExtras = extraAchievements.filter((e) => e.year === year && e.realized);
  let extraAchievementsAmount = 0;
  for (const extra of yearExtras) {
    extraAchievementsAmount += extra.amount;
  }
  extraAchievementsAmount = round2(extraAchievementsAmount);

  return {
    year,
    totalGoals,
    achievedGoals,
    notAchievedGoals,
    inProgressGoals,
    noDeadlineGoals,
    achievementRate,
    extraAchievementsAmount,
    extraAchievementsCount: yearExtras.length,
    byCategoryRate,
  };
}
