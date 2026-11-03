/**
 * Motor de Cartões de Crédito (AC-6, AC-7, AC-8, AC-9)
 * Reconciliação Fatura Informada × Detalhado, Compras Parceladas e Integração com Módulo 1.
 */

import { round2 } from './finance-engine.ts';
import type {
  CreditCard,
  InstallmentPurchase,
  ComputedInstallmentPurchase,
  CardMonthReconciliation,
  ComputedCardSummary,
  FinancialCategoryLine,
  CardCategoryBreakdown,
} from './types.ts';

export function computeInstallmentPurchase(
  purchase: InstallmentPurchase,
  targetYear: number
): ComputedInstallmentPurchase {
  const installments = Math.max(1, purchase.installments);
  const installmentAmount = round2(purchase.totalAmount / installments);

  const monthlyScheduleForYear: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) {
    monthlyScheduleForYear[m] = 0;
  }

  let remainingAfterDecember = 0;
  let lastInvoiceYear = purchase.firstInvoiceYear;
  let lastInvoiceMonth = purchase.firstInvoiceMonth;

  for (let k = 0; k < installments; k++) {
    const totalMonthOffset = purchase.firstInvoiceMonth - 1 + k;
    const invYear = purchase.firstInvoiceYear + Math.floor(totalMonthOffset / 12);
    const invMonth = (totalMonthOffset % 12) + 1;

    lastInvoiceYear = invYear;
    lastInvoiceMonth = invMonth;

    if (invYear === targetYear) {
      monthlyScheduleForYear[invMonth] = round2(
        (monthlyScheduleForYear[invMonth] || 0) + installmentAmount
      );
    } else if (invYear > targetYear) {
      remainingAfterDecember = round2(remainingAfterDecember + installmentAmount);
    }
  }

  return {
    ...purchase,
    installmentAmount,
    lastInvoiceYear,
    lastInvoiceMonth,
    monthlyScheduleForYear,
    remainingAfterDecember,
  };
}

export function computeCardSummary(
  card: CreditCard,
  purchases: InstallmentPurchase[],
  targetYear: number,
  referenceMonth: number
): ComputedCardSummary {
  const cardPurchases = purchases
    .filter((p) => p.cardId === card.id)
    .map((p) => computeInstallmentPurchase(p, targetYear));

  const months: Record<number, CardMonthReconciliation> = {};
  let remainingAfterDecember = 0;

  for (let m = 1; m <= 12; m++) {
    let detailed = 0;
    for (const cp of cardPurchases) {
      detailed += cp.monthlyScheduleForYear[m] || 0;
    }
    detailed = round2(detailed);

    const informed = card.informedInvoices[m] ?? null;
    const considered = informed !== null && informed !== undefined ? informed : detailed;
    const diff = informed !== null && informed !== undefined ? round2(informed - detailed) : 0;

    months[m] = {
      month: m,
      detailedAmount: detailed,
      informedAmount: informed,
      differenceToDetail: diff,
      consideredAmount: round2(considered),
    };
  }

  for (const cp of cardPurchases) {
    remainingAfterDecember += cp.remainingAfterDecember;
  }
  remainingAfterDecember = round2(remainingAfterDecember);

  const currentMonthInvoice = months[referenceMonth]?.consideredAmount ?? 0;
  let annualConsideredTotal = 0;
  for (let m = 1; m <= 12; m++) {
    annualConsideredTotal += months[m].consideredAmount;
  }
  annualConsideredTotal = round2(annualConsideredTotal);

  const limitUsageRatio =
    card.limitAmount > 0 ? round2(currentMonthInvoice / card.limitAmount) : 0;

  return {
    card,
    months,
    currentMonthInvoice,
    limitUsageRatio,
    remainingAfterDecember,
    annualConsideredTotal,
  };
}

export function syncCardsToFinancialLines(
  lines: FinancialCategoryLine[],
  cardSummaries: ComputedCardSummary[]
): FinancialCategoryLine[] {
  const summaryByCardId = new Map<string, ComputedCardSummary>();
  for (const cs of cardSummaries) {
    summaryByCardId.set(cs.card.id, cs);
  }

  return lines.map((line) => {
    if (!line.linkedCardId) {
      return line;
    }

    const summary = summaryByCardId.get(line.linkedCardId);
    if (!summary) {
      return line;
    }

    const updatedMonths = { ...line.months };
    for (let m = 1; m <= 12; m++) {
      const existing = updatedMonths[m] ?? {
        month: m,
        realized: 0,
        target: 0,
        settledAt: null,
      };
      updatedMonths[m] = {
        ...existing,
        realized: summary.months[m]?.consideredAmount ?? 0,
      };
    }

    return {
      ...line,
      months: updatedMonths,
    };
  });
}

export function computeCardCategoriesBreakdown(
  purchases: InstallmentPurchase[],
  targetYear: number
): CardCategoryBreakdown[] {
  const categoryMap = new Map<string, Record<number, number>>();

  for (const p of purchases) {
    const computed = computeInstallmentPurchase(p, targetYear);
    if (!categoryMap.has(p.category)) {
      const initMonths: Record<number, number> = {};
      for (let m = 1; m <= 12; m++) initMonths[m] = 0;
      categoryMap.set(p.category, initMonths);
    }

    const catMonths = categoryMap.get(p.category)!;
    for (let m = 1; m <= 12; m++) {
      catMonths[m] = round2(catMonths[m] + (computed.monthlyScheduleForYear[m] || 0));
    }
  }

  let grandTotal = 0;
  const list: { category: string; months: Record<number, number>; annualTotal: number }[] = [];

  for (const [category, months] of categoryMap.entries()) {
    let annualTotal = 0;
    for (let m = 1; m <= 12; m++) {
      annualTotal += months[m];
    }
    annualTotal = round2(annualTotal);
    grandTotal += annualTotal;
    list.push({ category, months, annualTotal });
  }

  return list.map((item) => ({
    ...item,
    shareOfTotal: grandTotal > 0 ? round2(item.annualTotal / grandTotal) : 0,
  }));
}
