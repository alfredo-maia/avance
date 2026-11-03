/**
 * Motor do Plano de Ação das Metas (AC-12, AC-13, AC-14)
 * Cálculos dos 4 tipos de indicadores, situação automática e sincronização com Módulo 1.
 */

import { round2 } from './finance-engine.ts';
import type {
  ActionPlanIndicator,
  ComputedActionPlanIndicator,
  ComputedFinancialLine,
  IndicatorSituation,
} from './types.ts';

export function computeActionPlanIndicator(
  indicator: ActionPlanIndicator,
  referenceDateStr: string
): ComputedActionPlanIndicator {
  let totalOrLastPlanned: number | string | null = null;
  let totalOrLastRealized: number | string | null = null;
  let achievementRatio = 0;

  switch (indicator.trackingType) {
    case 'SOMA': {
      let sumPlanned = 0;
      let sumRealized = 0;
      for (let m = 1; m <= 12; m++) {
        const entry = indicator.months[m];
        if (entry) {
          sumPlanned += entry.plannedValue ?? 0;
          sumRealized += entry.realizedValue ?? 0;
        }
      }
      totalOrLastPlanned = round2(sumPlanned);
      totalOrLastRealized = round2(sumRealized);
      achievementRatio =
        totalOrLastPlanned > 0 ? round2(totalOrLastRealized / totalOrLastPlanned) : 0;
      break;
    }

    case 'LIMITE_MAXIMO': {
      totalOrLastPlanned = indicator.targetValue ?? null;
      let monthsWithRealized = 0;
      let monthsWithinLimit = 0;
      let lastVal: number | null = null;

      for (let m = 1; m <= 12; m++) {
        const entry = indicator.months[m];
        if (entry && entry.realizedValue !== null && entry.realizedValue !== undefined) {
          monthsWithRealized += 1;
          lastVal = entry.realizedValue;
          const ceiling = entry.plannedValue ?? indicator.targetValue ?? Infinity;
          if (entry.realizedValue <= ceiling) {
            monthsWithinLimit += 1;
          }
        }
      }

      totalOrLastRealized = lastVal;
      achievementRatio =
        monthsWithRealized > 0 ? round2(monthsWithinLimit / monthsWithRealized) : 0;
      break;
    }

    case 'ULTIMO_VALOR_REDUZIR': {
      let initialPlanned: number | null = null;
      let lastRealized: number | null = null;

      for (let m = 1; m <= 12; m++) {
        const entry = indicator.months[m];
        if (entry) {
          if (initialPlanned === null && entry.plannedValue !== null && entry.plannedValue !== undefined) {
            initialPlanned = entry.plannedValue;
          }
          if (entry.realizedValue !== null && entry.realizedValue !== undefined) {
            lastRealized = entry.realizedValue;
          }
        }
      }

      totalOrLastPlanned = indicator.targetValue ?? null;
      totalOrLastRealized = lastRealized;

      const basePlanned = initialPlanned ?? 100;
      const targetMeta = indicator.targetValue ?? 0;
      const totalDeltaToReduce = basePlanned - targetMeta;

      if (totalDeltaToReduce > 0 && lastRealized !== null) {
        const reducedAmount = basePlanned - lastRealized;
        const ratio = reducedAmount / totalDeltaToReduce;
        achievementRatio = round2(Math.max(0, Math.min(1, ratio)));
      } else {
        achievementRatio = 0;
      }
      break;
    }

    case 'MARCO_TEXTO': {
      let lastTextPlanned: string | undefined = undefined;
      let lastTextRealized: string | undefined = undefined;

      for (let m = 1; m <= 12; m++) {
        const entry = indicator.months[m];
        if (entry) {
          if (entry.plannedText) lastTextPlanned = entry.plannedText;
          if (entry.realizedText) lastTextRealized = entry.realizedText;
        }
      }

      totalOrLastPlanned = lastTextPlanned ?? null;
      totalOrLastRealized = lastTextRealized ?? null;
      achievementRatio = indicator.completed ? 1 : 0;
      break;
    }
  }

  let situation: IndicatorSituation = 'Em andamento';
  if (indicator.completed) {
    situation = 'Concluída';
  } else if (achievementRatio >= 1) {
    situation = 'No alvo';
  } else if (
    indicator.deadline &&
    indicator.deadline.trim() !== '' &&
    referenceDateStr > indicator.deadline &&
    achievementRatio < 1
  ) {
    situation = 'Não atingido';
  } else {
    situation = 'Em andamento';
  }

  return {
    ...indicator,
    totalOrLastPlanned,
    totalOrLastRealized,
    achievementRatio,
    situation,
  };
}

export function syncFinanceToActionPlan(
  indicators: ActionPlanIndicator[],
  financeLines: ComputedFinancialLine[]
): ActionPlanIndicator[] {
  const lineById = new Map<string, ComputedFinancialLine>();
  for (const line of financeLines) {
    lineById.set(line.id, line);
  }

  return indicators.map((ind) => {
    if (!ind.linkedFinanceCategoryId && !ind.linkedFinanceGroup) {
      return ind;
    }

    const updatedMonths = { ...ind.months };

    if (ind.linkedFinanceCategoryId) {
      const line = lineById.get(ind.linkedFinanceCategoryId);
      if (line) {
        for (let m = 1; m <= 12; m++) {
          const existing = updatedMonths[m] ?? {
            month: m,
            plannedValue: null,
            realizedValue: null,
          };
          updatedMonths[m] = {
            ...existing,
            realizedValue: line.months[m]?.realized ?? 0,
          };
        }
      }
    } else if (ind.linkedFinanceGroup) {
      const matchingLines = financeLines.filter((l) => l.group === ind.linkedFinanceGroup);
      for (let m = 1; m <= 12; m++) {
        let groupSum = 0;
        for (const line of matchingLines) {
          groupSum += line.months[m]?.realized ?? 0;
        }
        const existing = updatedMonths[m] ?? {
          month: m,
          plannedValue: null,
          realizedValue: null,
        };
        updatedMonths[m] = {
          ...existing,
          realizedValue: round2(groupSum),
        };
      }
    }

    return {
      ...ind,
      months: updatedMonths,
    };
  });
}
