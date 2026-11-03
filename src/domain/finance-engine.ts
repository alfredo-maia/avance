/**
 * Motor Financeiro de Domínio Puro (AC-3, AC-4, AC-5)
 * Implementa a regra do último saldo informado, motor determinístico de status e cálculo de KPIs.
 */

import type {
  FinancialGroup,
  SettlementStatus,
  GoalStatus,
  FinancialCategoryLine,
  ComputedFinancialLine,
  MonthlyKPIs,
} from './types.ts';

export function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function computeSettlementStatus(
  lineGroup: FinancialGroup,
  realized: number,
  target: number,
  settledAt: string | null,
  dueDay: number | undefined,
  referenceYear: number,
  referenceMonth: number,
  referenceDateStr: string
): SettlementStatus {
  if (realized === 0 && target === 0) {
    return '—';
  }

  if (settledAt && settledAt.trim() !== '') {
    return lineGroup === 'RECEITAS' ? '✔ Recebido' : '✔ Pago';
  }

  // Data de vencimento ajustada ao último dia do mês
  const defaultDue = dueDay && dueDay >= 1 && dueDay <= 31 ? dueDay : 10;
  const lastDayOfMonth = new Date(Date.UTC(referenceYear, referenceMonth, 0)).getUTCDate();
  const day = Math.min(defaultDue, lastDayOfMonth);
  const dueIso = `${referenceYear}-${String(referenceMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  if (dueIso < referenceDateStr) {
    return '⚠ Atrasado';
  }

  return lineGroup === 'RECEITAS' ? '⏳ A receber' : '⏳ A pagar';
}

export function computeGoalStatus(
  lineGroup: FinancialGroup,
  realized: number,
  target: number
): GoalStatus {
  if (target === 0) {
    return 'sem meta';
  }

  if (
    lineGroup === 'RECURSOS_FINANCEIROS' ||
    lineGroup === 'RECEITAS' ||
    lineGroup === 'INVESTIMENTOS'
  ) {
    return realized >= target ? 'bateu meta' : 'não bateu meta';
  }

  // DESPESAS_FIXAS e DESPESAS_VARIAVEIS: gastar menos ou igual à meta é bater a meta
  return realized <= target ? 'bateu meta' : 'não bateu meta';
}

export function computeFinancialLine(
  line: FinancialCategoryLine,
  referenceYear: number,
  referenceMonth: number,
  referenceDateStr: string
): ComputedFinancialLine {
  let totalTarget = 0;
  for (let m = 1; m <= 12; m++) {
    totalTarget += line.months[m]?.target ?? 0;
  }
  totalTarget = round2(totalTarget);

  let totalRealized = 0;
  if (line.group === 'RECURSOS_FINANCEIROS') {
    // AC-3: Regra do Último Saldo Informado
    for (let m = 12; m >= 1; m--) {
      const val = line.months[m]?.realized ?? 0;
      if (val > 0) {
        totalRealized = val;
        break;
      }
    }
  } else {
    for (let m = 1; m <= 12; m++) {
      totalRealized += line.months[m]?.realized ?? 0;
    }
  }
  totalRealized = round2(totalRealized);

  const monthlyAverage = round2(totalRealized / 12);
  const realMinusTarget = round2(totalRealized - totalTarget);

  let alreadySettledYear = 0;
  let pendingYear = 0;
  for (let m = 1; m <= 12; m++) {
    const entry = line.months[m];
    if (entry) {
      if (entry.settledAt && entry.settledAt.trim() !== '') {
        alreadySettledYear += entry.realized;
      } else {
        pendingYear += entry.target > 0 ? entry.target : entry.realized;
      }
    }
  }
  alreadySettledYear = round2(alreadySettledYear);
  pendingYear = round2(pendingYear);

  const refEntry = line.months[referenceMonth] ?? {
    month: referenceMonth,
    realized: 0,
    target: 0,
    settledAt: null,
  };

  const referenceMonthStatus = computeSettlementStatus(
    line.group,
    refEntry.realized,
    refEntry.target,
    refEntry.settledAt,
    line.dueDay,
    referenceYear,
    referenceMonth,
    referenceDateStr
  );

  const referenceMonthGoalStatus = computeGoalStatus(
    line.group,
    refEntry.realized,
    refEntry.target
  );

  const referenceMonthValue =
    refEntry.realized > 0 ? refEntry.realized : refEntry.target;

  return {
    ...line,
    totalRealized,
    totalTarget,
    monthlyAverage,
    realMinusTarget,
    alreadySettledYear,
    pendingYear,
    referenceMonthStatus,
    referenceMonthGoalStatus,
    referenceMonthValue,
  };
}

export function computeMonthlyKPIs(
  computedLines: ComputedFinancialLine[],
  referenceYear: number,
  referenceMonth: number,
  referenceDateStr: string
): MonthlyKPIs {
  let monthRevenue = 0;
  let monthSocialRevenue = 0;
  let monthInvestments = 0;
  let monthFixedExpenses = 0;
  let monthVariableExpenses = 0;
  let monthCardExpenses = 0;

  let receivedInMonth = 0;
  let toReceiveInMonth = 0;
  let paidInMonth = 0;
  let toPayInMonth = 0;
  let overdueCount = 0;
  let overdueAmount = 0;

  let totalAssetsLastBalance = 0;
  let totalAssetsPF = 0;
  let totalAssetsPJ = 0;

  for (const line of computedLines) {
    const refEntry = line.months[referenceMonth] ?? {
      month: referenceMonth,
      realized: 0,
      target: 0,
      settledAt: null,
    };
    const val = refEntry.realized;
    const targetVal = refEntry.target;
    const effectiveVal = val > 0 ? val : targetVal;

    if (line.group === 'RECURSOS_FINANCEIROS') {
      totalAssetsLastBalance += line.totalRealized;
      if (line.profile === 'PF') {
        totalAssetsPF += line.totalRealized;
      } else if (line.profile === 'PJ') {
        totalAssetsPJ += line.totalRealized;
      }
    } else if (line.group === 'RECEITAS') {
      monthRevenue += val;
      if (line.subGroup === 'Rendimento Social') {
        monthSocialRevenue += val;
      }
      if (line.referenceMonthStatus === '✔ Recebido') {
        receivedInMonth += val;
      } else if (line.referenceMonthStatus === '⏳ A receber') {
        toReceiveInMonth += effectiveVal;
      }
    } else if (line.group === 'INVESTIMENTOS') {
      monthInvestments += val;
      if (line.referenceMonthStatus === '✔ Pago') {
        paidInMonth += val;
      } else if (line.referenceMonthStatus === '⏳ A pagar') {
        toPayInMonth += effectiveVal;
      } else if (line.referenceMonthStatus === '⚠ Atrasado') {
        overdueCount += 1;
        overdueAmount += effectiveVal;
      }
    } else if (line.group === 'DESPESAS_FIXAS') {
      monthFixedExpenses += val;
      if (line.referenceMonthStatus === '✔ Pago') {
        paidInMonth += val;
      } else if (line.referenceMonthStatus === '⏳ A pagar') {
        toPayInMonth += effectiveVal;
      } else if (line.referenceMonthStatus === '⚠ Atrasado') {
        overdueCount += 1;
        overdueAmount += effectiveVal;
      }
    } else if (line.group === 'DESPESAS_VARIAVEIS') {
      monthVariableExpenses += val;
      if (line.linkedCardId) {
        monthCardExpenses += val;
      }
      if (line.referenceMonthStatus === '✔ Pago') {
        paidInMonth += val;
      } else if (line.referenceMonthStatus === '⏳ A pagar') {
        toPayInMonth += effectiveVal;
      } else if (line.referenceMonthStatus === '⚠ Atrasado') {
        overdueCount += 1;
        overdueAmount += effectiveVal;
      }
    }
  }

  // Cálculos consolidados do mês
  monthRevenue = round2(monthRevenue);
  monthSocialRevenue = round2(monthSocialRevenue);
  monthInvestments = round2(monthInvestments);
  monthFixedExpenses = round2(monthFixedExpenses);
  monthVariableExpenses = round2(monthVariableExpenses);
  monthCardExpenses = round2(monthCardExpenses);

  receivedInMonth = round2(receivedInMonth);
  toReceiveInMonth = round2(toReceiveInMonth);
  paidInMonth = round2(paidInMonth);
  toPayInMonth = round2(toPayInMonth);
  overdueAmount = round2(overdueAmount);

  const monthFinalResult = round2(
    monthRevenue - monthInvestments - monthFixedExpenses - monthVariableExpenses
  );

  // Acumulado do ano até o mês de referência
  let accumulatedResultYear = 0;
  const monthsSetWithRevenue = new Set<number>();
  for (let m = 1; m <= referenceMonth; m++) {
    let mRev = 0;
    let mInv = 0;
    let mFix = 0;
    let mVar = 0;
    for (const line of computedLines) {
      const entry = line.months[m];
      if (entry) {
        if (line.group === 'RECEITAS') {
          mRev += entry.realized;
          if (entry.realized > 0) monthsSetWithRevenue.add(m);
        } else if (line.group === 'INVESTIMENTOS') {
          mInv += entry.realized;
        } else if (line.group === 'DESPESAS_FIXAS') {
          mFix += entry.realized;
        } else if (line.group === 'DESPESAS_VARIAVEIS') {
          mVar += entry.realized;
        }
      }
    }
    accumulatedResultYear += mRev - mInv - mFix - mVar;
  }
  accumulatedResultYear = round2(accumulatedResultYear);

  const investmentRate =
    monthRevenue > 0 ? round2(monthInvestments / monthRevenue) : 0;
  const cardsToRevenueRate =
    monthRevenue > 0 ? round2(monthCardExpenses / monthRevenue) : 0;

  const totalBillsDenom = paidInMonth + toPayInMonth + overdueAmount;
  const paidBillsPercentage =
    totalBillsDenom > 0 ? round2(paidInMonth / totalBillsDenom) : 0;

  return {
    referenceYear,
    referenceMonth,
    receivedInMonth,
    toReceiveInMonth,
    paidInMonth,
    toPayInMonth,
    overdueCount,
    overdueAmount,
    monthRevenue,
    monthSocialRevenue,
    monthInvestments,
    monthFixedExpenses,
    monthVariableExpenses,
    monthCardExpenses,
    monthFinalResult,
    accumulatedResultYear,
    monthsWithRevenue: monthsSetWithRevenue.size,
    investmentRate,
    cardsToRevenueRate,
    paidBillsPercentage,
    totalAssetsLastBalance: round2(totalAssetsLastBalance),
    totalAssetsPF: round2(totalAssetsPF),
    totalAssetsPJ: round2(totalAssetsPJ),
  };
}
