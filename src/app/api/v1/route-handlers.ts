/**
 * Handlers de Rotas de API REST/JSON (AC-15)
 * Fornece endpoints com validação de schema e isolamento multi-tenant.
 */

import type { SaaSStore } from '../../../server/saas-store.ts';
import type {
  SaaSPlan,
  FinancialGroup,
  ProfileType,
  MonthlyTriad,
  GoalCategory,
  IndicatorTrackingType,
} from '../../../domain/types.ts';

export interface ApiResponse<T = any> {
  status: number;
  data?: T;
  error?: string;
}

export function createApiRouteHandlers(store: SaaSStore) {
  return {
    async handleGetTenants(): Promise<ApiResponse> {
      try {
        const tenants = store.listTenants();
        return { status: 200, data: tenants };
      } catch (err: any) {
        return { status: 500, error: err.message };
      }
    },

    async handlePostTenant(body: {
      name: string;
      slug?: string;
      plan?: SaaSPlan;
    }): Promise<ApiResponse> {
      try {
        if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
          return { status: 400, error: 'O nome do tenant é obrigatório.' };
        }
        const tenant = store.createTenantWithSeed(
          body.name.trim(),
          body.slug,
          body.plan || 'PRO'
        );
        return { status: 201, data: tenant };
      } catch (err: any) {
        return { status: 500, error: err.message };
      }
    },

    async handleGetDashboard(query: {
      tenantId: string;
      year?: number | string;
      month?: number | string;
      referenceDate?: string;
    }): Promise<ApiResponse> {
      try {
        if (!query.tenantId) {
          return { status: 400, error: 'O parâmetro tenantId é obrigatório.' };
        }
        const year = query.year ? Number(query.year) : new Date().getFullYear();
        const month = query.month ? Number(query.month) : new Date().getMonth() + 1;
        const dashboard = store.getDashboard(query.tenantId, year, month, query.referenceDate);
        return { status: 200, data: dashboard };
      } catch (err: any) {
        const isNotFound = err.message.includes('not found') || err.message.includes('violation');
        return { status: isNotFound ? 404 : 500, error: err.message };
      }
    },

    async handleGetFinance(query: {
      tenantId: string;
      year?: number | string;
      month?: number | string;
      referenceDate?: string;
    }): Promise<ApiResponse> {
      try {
        if (!query.tenantId) {
          return { status: 400, error: 'O parâmetro tenantId é obrigatório.' };
        }
        const year = query.year ? Number(query.year) : new Date().getFullYear();
        const month = query.month ? Number(query.month) : new Date().getMonth() + 1;
        const dashboard = store.getDashboard(query.tenantId, year, month, query.referenceDate);
        return { status: 200, data: dashboard.finance };
      } catch (err: any) {
        return { status: 404, error: err.message };
      }
    },

    async handlePutFinanceEntry(body: {
      tenantId: string;
      lineId: string;
      month: number;
      realized?: number;
      target?: number;
      settledAt?: string | null;
    }): Promise<ApiResponse> {
      try {
        if (!body.tenantId || !body.lineId || !body.month) {
          return { status: 400, error: 'Campos tenantId, lineId e month são obrigatórios.' };
        }
        const updated = store.updateFinancialEntry(body.tenantId, body.lineId, body.month, {
          realized: body.realized,
          target: body.target,
          settledAt: body.settledAt,
        });
        return { status: 200, data: updated };
      } catch (err: any) {
        return { status: 404, error: err.message };
      }
    },

    async handlePostFinanceLine(body: {
      tenantId: string;
      name: string;
      profile?: ProfileType;
      group?: FinancialGroup;
      subGroup?: string;
      dueDay?: number;
      linkedCardId?: string;
      months?: Record<number, Partial<MonthlyTriad>>;
    }): Promise<ApiResponse> {
      try {
        if (!body.tenantId || !body.name || typeof body.name !== 'string' || body.name.trim() === '') {
          return { status: 400, error: 'Campos tenantId e name são obrigatórios.' };
        }
        const created = store.createFinancialLine(body.tenantId, {
          name: body.name.trim(),
          profile: body.profile || 'PF',
          group: body.group || 'RECURSOS_FINANCEIROS',
          subGroup: body.subGroup,
          dueDay: body.dueDay,
          linkedCardId: body.linkedCardId,
          months: body.months,
        });
        return { status: 201, data: created };
      } catch (err: any) {
        return { status: 500, error: err.message };
      }
    },

    async handlePutFinanceLine(body: {
      tenantId: string;
      lineId: string;
      name?: string;
      profile?: ProfileType;
      group?: FinancialGroup;
      subGroup?: string;
      dueDay?: number;
      linkedCardId?: string;
      months?: Record<number, Partial<MonthlyTriad>>;
    }): Promise<ApiResponse> {
      try {
        if (!body.tenantId || !body.lineId) {
          return { status: 400, error: 'Campos tenantId e lineId são obrigatórios.' };
        }
        const updated = store.updateFinancialLine(body.tenantId, body.lineId, {
          name: body.name?.trim(),
          profile: body.profile,
          group: body.group,
          subGroup: body.subGroup,
          dueDay: body.dueDay,
          linkedCardId: body.linkedCardId,
          months: body.months,
        });
        return { status: 200, data: updated };
      } catch (err: any) {
        const isNotFound = err.message.includes('NotFoundError') || err.message.includes('violation');
        return { status: isNotFound ? 404 : 500, error: err.message };
      }
    },

    async handleDeleteFinanceLine(body: {
      tenantId: string;
      lineId: string;
    }): Promise<ApiResponse> {
      try {
        if (!body.tenantId || !body.lineId) {
          return { status: 400, error: 'Campos tenantId e lineId são obrigatórios.' };
        }
        store.deleteFinancialLine(body.tenantId, body.lineId);
        return { status: 200, data: { success: true } };
      } catch (err: any) {
        const isNotFound = err.message.includes('NotFoundError') || err.message.includes('violation');
        return { status: isNotFound ? 404 : 500, error: err.message };
      }
    },

    async handleGetCards(query: {
      tenantId: string;
      year?: number | string;
      month?: number | string;
    }): Promise<ApiResponse> {
      try {
        if (!query.tenantId) {
          return { status: 400, error: 'O parâmetro tenantId é obrigatório.' };
        }
        const year = query.year ? Number(query.year) : new Date().getFullYear();
        const month = query.month ? Number(query.month) : new Date().getMonth() + 1;
        const dashboard = store.getDashboard(query.tenantId, year, month);
        return { status: 200, data: dashboard.cards };
      } catch (err: any) {
        return { status: 404, error: err.message };
      }
    },

    async handlePostCardPurchase(body: {
      tenantId: string;
      cardId: string;
      purchaseDate: string;
      description: string;
      category: string;
      totalAmount: number;
      installments: number;
      firstInvoiceYear: number;
      firstInvoiceMonth: number;
      notes?: string;
    }): Promise<ApiResponse> {
      try {
        if (!body.tenantId || !body.cardId || !body.totalAmount || !body.installments) {
          return { status: 400, error: 'Dados da compra incompletos.' };
        }
        const purchase = store.createPurchase(body.tenantId, {
          cardId: body.cardId,
          purchaseDate: body.purchaseDate,
          description: body.description,
          category: body.category,
          totalAmount: body.totalAmount,
          installments: body.installments,
          firstInvoiceYear: body.firstInvoiceYear,
          firstInvoiceMonth: body.firstInvoiceMonth,
          notes: body.notes,
        });
        return { status: 201, data: purchase };
      } catch (err: any) {
        return { status: 404, error: err.message };
      }
    },

    async handlePutCardInvoice(body: {
      tenantId: string;
      cardId: string;
      month: number;
      informedAmount: number | null;
    }): Promise<ApiResponse> {
      try {
        if (!body.tenantId || !body.cardId || !body.month) {
          return { status: 400, error: 'Campos tenantId, cardId e month são obrigatórios.' };
        }
        const card = store.updateCardInvoice(
          body.tenantId,
          body.cardId,
          body.month,
          body.informedAmount
        );
        return { status: 200, data: card };
      } catch (err: any) {
        return { status: 404, error: err.message };
      }
    },

    async handleGetGoals(query: {
      tenantId: string;
      year?: number | string;
    }): Promise<ApiResponse> {
      try {
        if (!query.tenantId) {
          return { status: 400, error: 'O parâmetro tenantId é obrigatório.' };
        }
        const year = query.year ? Number(query.year) : new Date().getFullYear();
        const dashboard = store.getDashboard(query.tenantId, year, 1);
        return { status: 200, data: dashboard.goals };
      } catch (err: any) {
        return { status: 404, error: err.message };
      }
    },

    async handlePostGoal(body: {
      tenantId: string;
      year: number;
      code: string;
      category: GoalCategory;
      title: string;
      deadline: string | null;
      targetAmount: number | null;
      realized?: boolean;
      resultComment?: string;
    }): Promise<ApiResponse> {
      try {
        if (!body.tenantId || !body.year || !body.title) {
          return { status: 400, error: 'Campos tenantId, year e title são obrigatórios.' };
        }
        const goal = store.createGoal(body.tenantId, {
          year: body.year,
          code: body.code,
          category: body.category,
          title: body.title,
          deadline: body.deadline,
          targetAmount: body.targetAmount,
          realized: !!body.realized,
          resultComment: body.resultComment,
        });
        return { status: 201, data: goal };
      } catch (err: any) {
        return { status: 404, error: err.message };
      }
    },

    async handleGetActionPlan(query: {
      tenantId: string;
      year?: number | string;
    }): Promise<ApiResponse> {
      try {
        if (!query.tenantId) {
          return { status: 400, error: 'O parâmetro tenantId é obrigatório.' };
        }
        const year = query.year ? Number(query.year) : new Date().getFullYear();
        const dashboard = store.getDashboard(query.tenantId, year, 1);
        return { status: 200, data: dashboard.actionPlan };
      } catch (err: any) {
        return { status: 404, error: err.message };
      }
    },

    async handlePutActionPlanIndicator(body: {
      tenantId: string;
      indicatorId: string;
      name?: string;
      completed?: boolean;
      targetValue?: number | null;
      months?: Record<number, any>;
    }): Promise<ApiResponse> {
      try {
        if (!body.tenantId || !body.indicatorId) {
          return { status: 400, error: 'Campos tenantId e indicatorId são obrigatórios.' };
        }
        const updated = store.updateActionPlanIndicator(body.tenantId, body.indicatorId, {
          name: body.name,
          completed: body.completed,
          targetValue: body.targetValue,
          months: body.months,
        });
        return { status: 200, data: updated };
      } catch (err: any) {
        return { status: 404, error: err.message };
      }
    },
  };
}
