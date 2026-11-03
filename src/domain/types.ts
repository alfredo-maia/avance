/**
 * Contratos de Domínio e API do Avance SaaS Multi-Tenant Financeiro e de Metas (ADR-0002 / SPEC AC-1 a AC-16)
 */

export type SaaSPlan = 'FREE' | 'PRO' | 'ENTERPRISE';
export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
export type ProfileType = 'PF' | 'PJ';

export type FinancialGroup =
  | 'RECURSOS_FINANCEIROS'
  | 'RECEITAS'
  | 'INVESTIMENTOS'
  | 'DESPESAS_FIXAS'
  | 'DESPESAS_VARIAVEIS';

export type SettlementStatus =
  | '—'
  | '✔ Recebido'
  | '✔ Pago'
  | '⏳ A receber'
  | '⏳ A pagar'
  | '⚠ Atrasado';

export type GoalStatus = 'bateu meta' | 'não bateu meta' | 'sem meta';

export type GoalCategory =
  | 'FINANCEIRA'
  | 'DESENVOLVIMENTO_PESSOAL'
  | 'FISICA_SAUDE'
  | 'DIVERSAO';

export type GoalSituation =
  | 'Atingida'
  | 'Sem prazo'
  | 'Não atingida'
  | 'Em andamento';

export type GoalEvaluation =
  | 'Atingida'
  | 'Justificativa Aceitável'
  | 'Justificativa NÃO Aceitável';

export type IndicatorTrackingType =
  | 'SOMA'
  | 'LIMITE_MAXIMO'
  | 'ULTIMO_VALOR_REDUZIR'
  | 'MARCO_TEXTO';

export type IndicatorSituation =
  | 'Concluída'
  | 'No alvo'
  | 'Não atingido'
  | 'Em andamento';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: SaaSPlan;
  active: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface MonthlyTriad {
  month: number; // 1..12
  realized: number;
  target: number;
  settledAt: string | null; // YYYY-MM-DD or null
}

export interface FinancialCategoryLine {
  id: string;
  tenantId: string;
  group: FinancialGroup;
  subGroup?: string;
  name: string;
  profile: ProfileType;
  dueDay?: number;
  linkedCardId?: string;
  months: Record<number, MonthlyTriad>; // 1..12
}

export interface ComputedFinancialLine extends FinancialCategoryLine {
  totalRealized: number;
  totalTarget: number;
  monthlyAverage: number;
  realMinusTarget: number;
  alreadySettledYear: number;
  pendingYear: number;
  referenceMonthStatus: SettlementStatus;
  referenceMonthGoalStatus: GoalStatus;
  referenceMonthValue: number;
}

export interface MonthlyKPIs {
  referenceYear: number;
  referenceMonth: number;
  receivedInMonth: number;
  toReceiveInMonth: number;
  paidInMonth: number;
  toPayInMonth: number;
  overdueCount: number;
  overdueAmount: number;
  monthRevenue: number;
  monthSocialRevenue: number;
  monthInvestments: number;
  monthFixedExpenses: number;
  monthVariableExpenses: number;
  monthCardExpenses: number;
  monthFinalResult: number;
  accumulatedResultYear: number;
  monthsWithRevenue: number;
  investmentRate: number; // investments / revenue
  cardsToRevenueRate: number; // cards / revenue
  paidBillsPercentage: number; // paid / (paid + toPay + overdueExpenses)
  totalAssetsLastBalance: number;
  totalAssetsPF: number;
  totalAssetsPJ: number;
}

export interface CreditCard {
  id: string;
  tenantId: string;
  name: string;
  profile: ProfileType;
  closingDay: number;
  dueDay: number;
  limitAmount: number;
  informedInvoices: Record<number, number | null>; // month 1..12 -> informed value or null
}

export interface InstallmentPurchase {
  id: string;
  tenantId: string;
  cardId: string;
  purchaseDate: string; // YYYY-MM-DD
  description: string;
  category: string;
  totalAmount: number;
  installments: number;
  firstInvoiceYear: number;
  firstInvoiceMonth: number; // 1..12
  notes?: string;
}

export interface ComputedInstallmentPurchase extends InstallmentPurchase {
  installmentAmount: number;
  lastInvoiceYear: number;
  lastInvoiceMonth: number;
  monthlyScheduleForYear: Record<number, number>; // 1..12
  remainingAfterDecember: number;
}

export interface CardMonthReconciliation {
  month: number;
  detailedAmount: number;
  informedAmount: number | null;
  differenceToDetail: number;
  consideredAmount: number;
}

export interface ComputedCardSummary {
  card: CreditCard;
  months: Record<number, CardMonthReconciliation>; // 1..12
  currentMonthInvoice: number;
  limitUsageRatio: number;
  remainingAfterDecember: number;
  annualConsideredTotal: number;
}

export interface CardCategoryBreakdown {
  category: string;
  months: Record<number, number>; // 1..12
  annualTotal: number;
  shareOfTotal: number;
}

export interface MultiYearGoal {
  id: string;
  tenantId: string;
  year: number;
  code: string;
  category: GoalCategory;
  title: string;
  deadline: string | null; // YYYY-MM-DD or null
  targetAmount: number | null;
  realized: boolean;
  resultComment?: string;
  evaluation?: GoalEvaluation;
}

export interface ComputedMultiYearGoal extends MultiYearGoal {
  situation: GoalSituation;
  remainingDays: number | null;
}

export interface ExtraAchievement {
  id: string;
  tenantId: string;
  year: number;
  category: GoalCategory;
  title: string;
  amount: number;
  realized: boolean;
  notes?: string;
}

export interface YearGoalsSummary {
  year: number;
  totalGoals: number;
  achievedGoals: number;
  notAchievedGoals: number;
  inProgressGoals: number;
  noDeadlineGoals: number;
  achievementRate: number;
  extraAchievementsAmount: number;
  extraAchievementsCount: number;
  byCategoryRate: Record<GoalCategory, number>;
}

export interface IndicatorMonthEntry {
  month: number; // 1..12
  plannedValue: number | null;
  realizedValue: number | null;
  plannedText?: string;
  realizedText?: string;
}

export interface ActionPlanIndicator {
  id: string;
  tenantId: string;
  goalId: string;
  year: number;
  name: string;
  deadline: string | null; // YYYY-MM-DD
  targetValue: number | null;
  completed: boolean;
  trackingType: IndicatorTrackingType;
  linkedFinanceCategoryId?: string;
  linkedFinanceGroup?: FinancialGroup;
  notes?: string;
  months: Record<number, IndicatorMonthEntry>; // 1..12
}

export interface ComputedActionPlanIndicator extends ActionPlanIndicator {
  totalOrLastPlanned: number | string | null;
  totalOrLastRealized: number | string | null;
  achievementRatio: number; // 0..1+
  situation: IndicatorSituation;
}
