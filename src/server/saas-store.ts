/**
 * Repositório e Serviço Multi-Tenant SaaS (AC-1, AC-15)
 * Garante isolamento estrito por tenantId e consolidação dos 4 módulos.
 */

import { createTenantTemplate } from '../domain/template-seed.ts';
import {
  computeFinancialLine,
  computeMonthlyKPIs,
} from '../domain/finance-engine.ts';
import {
  computeCardSummary,
  syncCardsToFinancialLines,
  computeCardCategoriesBreakdown,
} from '../domain/cards-engine.ts';
import {
  computeGoalsSummary,
  computeMultiYearGoal,
} from '../domain/goals-engine.ts';
import {
  computeActionPlanIndicator,
  syncFinanceToActionPlan,
} from '../domain/action-plan-engine.ts';
import type {
  Tenant,
  SaaSPlan,
  FinancialCategoryLine,
  ComputedFinancialLine,
  CreditCard,
  InstallmentPurchase,
  MultiYearGoal,
  ExtraAchievement,
  ActionPlanIndicator,
  MonthlyKPIs,
  ComputedCardSummary,
  CardCategoryBreakdown,
  YearGoalsSummary,
  ComputedMultiYearGoal,
  ComputedActionPlanIndicator,
} from '../domain/types.ts';

export interface ConsolidatedDashboard {
  tenant: Tenant;
  referenceYear: number;
  referenceMonth: number;
  referenceDate: string;
  finance: {
    lines: ComputedFinancialLine[];
    kpis: MonthlyKPIs;
  };
  cards: {
    summaries: ComputedCardSummary[];
    categoryBreakdown: CardCategoryBreakdown[];
  };
  goals: {
    summary: YearGoalsSummary;
    items: ComputedMultiYearGoal[];
    extraAchievements: ExtraAchievement[];
  };
  actionPlan: {
    indicators: ComputedActionPlanIndicator[];
  };
}

export class SaaSStore {
  private tenants = new Map<string, Tenant>();
  private financialLines = new Map<string, Map<string, FinancialCategoryLine>>();
  private cards = new Map<string, Map<string, CreditCard>>();
  private purchases = new Map<string, Map<string, InstallmentPurchase>>();
  private goals = new Map<string, Map<string, MultiYearGoal>>();
  private extraAchievements = new Map<string, Map<string, ExtraAchievement>>();
  private actionPlanIndicators = new Map<string, Map<string, ActionPlanIndicator>>();

  private ensureTenant(tenantId: string): Tenant {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant isolation violation: Tenant '${tenantId}' not found or inaccessible.`);
    }
    return tenant;
  }

  createTenantWithSeed(name: string, slug?: string, plan: SaaSPlan = 'PRO'): Tenant {
    const tenantId = `tenant-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const template = createTenantTemplate(tenantId, name, plan);
    if (slug) {
      template.tenant.slug = slug;
    }

    this.tenants.set(tenantId, template.tenant);

    const lineMap = new Map<string, FinancialCategoryLine>();
    for (const l of template.lines) {
      lineMap.set(l.id, l);
    }
    this.financialLines.set(tenantId, lineMap);

    const cardMap = new Map<string, CreditCard>();
    for (const c of template.cards) {
      cardMap.set(c.id, c);
    }
    this.cards.set(tenantId, cardMap);

    this.purchases.set(tenantId, new Map());
    this.goals.set(tenantId, new Map());
    this.extraAchievements.set(tenantId, new Map());
    this.actionPlanIndicators.set(tenantId, new Map());

    return template.tenant;
  }

  getTenant(tenantId: string): Tenant {
    return this.ensureTenant(tenantId);
  }

  listTenants(): Tenant[] {
    return Array.from(this.tenants.values());
  }

  listFinancialLines(tenantId: string, _year?: number): FinancialCategoryLine[] {
    this.ensureTenant(tenantId);
    const map = this.financialLines.get(tenantId) || new Map();
    return Array.from(map.values());
  }

  updateFinancialEntry(
    tenantId: string,
    lineId: string,
    month: number,
    data: { realized?: number; target?: number; settledAt?: string | null }
  ): FinancialCategoryLine {
    this.ensureTenant(tenantId);
    const lineMap = this.financialLines.get(tenantId);
    const line = lineMap?.get(lineId);

    if (!line) {
      throw new Error(`NotFoundError: Line '${lineId}' not found for tenant '${tenantId}'.`);
    }

    const currentEntry = line.months[month] ?? {
      month,
      realized: 0,
      target: 0,
      settledAt: null,
    };

    line.months[month] = {
      month,
      realized: data.realized !== undefined ? data.realized : currentEntry.realized,
      target: data.target !== undefined ? data.target : currentEntry.target,
      settledAt: data.settledAt !== undefined ? data.settledAt : currentEntry.settledAt,
    };

    return line;
  }

  listCards(tenantId: string, targetYear: number = new Date().getFullYear()): ComputedCardSummary[] {
    this.ensureTenant(tenantId);
    const cardMap = this.cards.get(tenantId) || new Map();
    const purchaseMap = this.purchases.get(tenantId) || new Map();
    const purchases = Array.from(purchaseMap.values());

    return Array.from(cardMap.values()).map((card) =>
      computeCardSummary(card, purchases, targetYear, 1)
    );
  }

  updateCardInvoice(
    tenantId: string,
    cardId: string,
    month: number,
    informedAmount: number | null
  ): CreditCard {
    this.ensureTenant(tenantId);
    const cardMap = this.cards.get(tenantId);
    const card = cardMap?.get(cardId);
    if (!card) {
      throw new Error(`NotFoundError: Card '${cardId}' not found for tenant '${tenantId}'.`);
    }

    card.informedInvoices[month] = informedAmount;
    return card;
  }

  createPurchase(
    tenantId: string,
    data: Omit<InstallmentPurchase, 'id' | 'tenantId'>
  ): InstallmentPurchase {
    this.ensureTenant(tenantId);
    const purchaseMap = this.purchases.get(tenantId)!;
    const cardMap = this.cards.get(tenantId)!;

    if (!cardMap.has(data.cardId)) {
      throw new Error(`NotFoundError: Card '${data.cardId}' not found for tenant '${tenantId}'.`);
    }

    const id = `pur-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const purchase: InstallmentPurchase = {
      ...data,
      id,
      tenantId,
    };

    purchaseMap.set(id, purchase);
    return purchase;
  }

  listPurchases(tenantId: string): InstallmentPurchase[] {
    this.ensureTenant(tenantId);
    const map = this.purchases.get(tenantId) || new Map();
    return Array.from(map.values());
  }

  listGoals(tenantId: string, year: number): MultiYearGoal[] {
    this.ensureTenant(tenantId);
    const map = this.goals.get(tenantId) || new Map();
    return Array.from(map.values()).filter((g) => g.year === year);
  }

  createGoal(
    tenantId: string,
    data: Omit<MultiYearGoal, 'id' | 'tenantId'>
  ): MultiYearGoal {
    this.ensureTenant(tenantId);
    const goalMap = this.goals.get(tenantId)!;
    const id = `goal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const goal: MultiYearGoal = {
      ...data,
      id,
      tenantId,
    };
    goalMap.set(id, goal);
    return goal;
  }

  updateGoal(
    tenantId: string,
    goalId: string,
    data: Partial<MultiYearGoal>
  ): MultiYearGoal {
    this.ensureTenant(tenantId);
    const goalMap = this.goals.get(tenantId)!;
    const goal = goalMap.get(goalId);
    if (!goal) {
      throw new Error(`NotFoundError: Goal '${goalId}' not found for tenant '${tenantId}'.`);
    }

    Object.assign(goal, data);
    return goal;
  }

  listExtraAchievements(tenantId: string, year: number): ExtraAchievement[] {
    this.ensureTenant(tenantId);
    const map = this.extraAchievements.get(tenantId) || new Map();
    return Array.from(map.values()).filter((e) => e.year === year);
  }

  createExtraAchievement(
    tenantId: string,
    data: Omit<ExtraAchievement, 'id' | 'tenantId'>
  ): ExtraAchievement {
    this.ensureTenant(tenantId);
    const extraMap = this.extraAchievements.get(tenantId)!;
    const id = `ext-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const extra: ExtraAchievement = {
      ...data,
      id,
      tenantId,
    };
    extraMap.set(id, extra);
    return extra;
  }

  listActionPlanIndicators(tenantId: string, year: number): ActionPlanIndicator[] {
    this.ensureTenant(tenantId);
    const map = this.actionPlanIndicators.get(tenantId) || new Map();
    return Array.from(map.values()).filter((i) => i.year === year);
  }

  createActionPlanIndicator(
    tenantId: string,
    data: Omit<ActionPlanIndicator, 'id' | 'tenantId'>
  ): ActionPlanIndicator {
    this.ensureTenant(tenantId);
    const indMap = this.actionPlanIndicators.get(tenantId)!;
    const id = `ind-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const indicator: ActionPlanIndicator = {
      ...data,
      id,
      tenantId,
    };
    indMap.set(id, indicator);
    return indicator;
  }

  updateActionPlanIndicator(
    tenantId: string,
    indicatorId: string,
    data: Partial<ActionPlanIndicator>
  ): ActionPlanIndicator {
    this.ensureTenant(tenantId);
    const indMap = this.actionPlanIndicators.get(tenantId)!;
    const indicator = indMap.get(indicatorId);
    if (!indicator) {
      throw new Error(
        `NotFoundError: Indicator '${indicatorId}' not found for tenant '${tenantId}'.`
      );
    }

    if (data.months) {
      indicator.months = { ...indicator.months, ...data.months };
      delete data.months;
    }
    Object.assign(indicator, data);
    return indicator;
  }

  getDashboard(
    tenantId: string,
    year: number = new Date().getFullYear(),
    month: number = new Date().getMonth() + 1,
    referenceDateStr?: string
  ): ConsolidatedDashboard {
    const tenant = this.ensureTenant(tenantId);
    const refDate = referenceDateStr || new Date().toISOString().split('T')[0];

    // 1. Módulo 2: Cartões de Crédito
    const cardMap = this.cards.get(tenantId) || new Map();
    const purchaseMap = this.purchases.get(tenantId) || new Map();
    const rawCards = Array.from(cardMap.values());
    const rawPurchases = Array.from(purchaseMap.values());

    const cardSummaries = rawCards.map((c) =>
      computeCardSummary(c, rawPurchases, year, month)
    );
    const categoryBreakdown = computeCardCategoriesBreakdown(rawPurchases, year);

    // 2. Módulo 1: Linhas Financeiras com sincronização automática de Cartões (AC-7)
    const rawLines = Array.from(this.financialLines.get(tenantId)?.values() || []);
    const syncedLines = syncCardsToFinancialLines(rawLines, cardSummaries);
    const computedLines = syncedLines.map((l) =>
      computeFinancialLine(l, year, month, refDate)
    );
    const kpis = computeMonthlyKPIs(computedLines, year, month, refDate);

    // 3. Módulo 3: Metas e Conquistas Extras
    const rawGoals = Array.from(this.goals.get(tenantId)?.values() || []).filter(
      (g) => g.year === year
    );
    const rawExtras = Array.from(
      this.extraAchievements.get(tenantId)?.values() || []
    ).filter((e) => e.year === year);
    const goalsSummary = computeGoalsSummary(rawGoals, rawExtras, year, refDate);
    const computedGoalItems = rawGoals.map((g) =>
      computeMultiYearGoal(g, refDate)
    );

    // 4. Módulo 4: Plano de Ação com sincronização automática de Finanças (AC-14)
    const rawIndicators = Array.from(
      this.actionPlanIndicators.get(tenantId)?.values() || []
    ).filter((i) => i.year === year);
    const syncedIndicators = syncFinanceToActionPlan(rawIndicators, computedLines);
    const computedIndicators = syncedIndicators.map((i) =>
      computeActionPlanIndicator(i, refDate)
    );

    return {
      tenant,
      referenceYear: year,
      referenceMonth: month,
      referenceDate: refDate,
      finance: {
        lines: computedLines,
        kpis,
      },
      cards: {
        summaries: cardSummaries,
        categoryBreakdown,
      },
      goals: {
        summary: goalsSummary,
        items: computedGoalItems,
        extraAchievements: rawExtras,
      },
      actionPlan: {
        indicators: computedIndicators,
      },
    };
  }
}
