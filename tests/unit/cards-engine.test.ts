import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeInstallmentPurchase,
  computeCardSummary,
  syncCardsToFinancialLines,
  computeCardCategoriesBreakdown,
} from '../../src/domain/cards-engine.ts';
import type { CreditCard, InstallmentPurchase, FinancialCategoryLine } from '../../src/domain/types.ts';

describe('Módulo 2: Cartões de Crédito (AC-6, AC-7, AC-8, AC-9)', () => {
  const sampleCard: CreditCard = {
    id: 'card-bb',
    tenantId: 'tenant-1',
    name: 'Banco do Brasil',
    profile: 'PF',
    closingDay: 25,
    dueDay: 5,
    limitAmount: 5000,
    informedInvoices: {
      1: 1200, // informado pelo usuário/banco
      2: null, // não informado -> deve usar o detalhado
      3: null,
      4: null,
      5: null,
      6: null,
      7: null,
      8: null,
      9: null,
      10: null,
      11: null,
      12: null,
    },
  };

  describe('AC-8: Motor de Compras Parceladas e Saldo Pós-Dezembro', () => {
    test('calcula parcelas distribuídas e saldo remanescente pós-dezembro', () => {
      // Compra de R$ 1.200 em 10x iniciando em Outubro (mês 10) de 2026
      // Parcela: 120,00 por mês.
      // Meses em 2026: 10 (Out), 11 (Nov), 12 (Dez) = 3 parcelas = 360,00
      // Meses em 2027: 1 (Jan) a 7 (Jul) = 7 parcelas = 840,00 pós-dezembro
      const purchase: InstallmentPurchase = {
        id: 'pur-1',
        tenantId: 'tenant-1',
        cardId: 'card-bb',
        purchaseDate: '2026-10-02',
        description: 'Smartphone',
        category: 'Vestuário',
        totalAmount: 1200,
        installments: 10,
        firstInvoiceYear: 2026,
        firstInvoiceMonth: 10,
      };

      const computed = computeInstallmentPurchase(purchase, 2026);

      assert.equal(computed.installmentAmount, 120);
      assert.equal(computed.monthlyScheduleForYear[10], 120);
      assert.equal(computed.monthlyScheduleForYear[11], 120);
      assert.equal(computed.monthlyScheduleForYear[12], 120);
      assert.equal(computed.monthlyScheduleForYear[1], 0);
      assert.equal(computed.remainingAfterDecember, 840);
      assert.equal(computed.lastInvoiceYear, 2027);
      assert.equal(computed.lastInvoiceMonth, 7);
    });
  });

  describe('AC-6: Reconciliação de Faturas e Valor Considerado', () => {
    test('usa informedAmount quando preenchido e detailedAmount quando null', () => {
      const purchases: InstallmentPurchase[] = [
        {
          id: 'p1',
          tenantId: 'tenant-1',
          cardId: 'card-bb',
          purchaseDate: '2026-01-10',
          description: 'Mercado',
          category: 'Supermercado',
          totalAmount: 900,
          installments: 3,
          firstInvoiceYear: 2026,
          firstInvoiceMonth: 1,
        },
      ];

      const summary = computeCardSummary(sampleCard, purchases, 2026, 1);

      // No mês 1:
      // detalhado = 300 (parcela 1 de 3)
      // informado = 1200
      // considerado = 1200
      // diferenca = 1200 - 300 = 900
      assert.equal(summary.months[1].detailedAmount, 300);
      assert.equal(summary.months[1].informedAmount, 1200);
      assert.equal(summary.months[1].consideredAmount, 1200);
      assert.equal(summary.months[1].differenceToDetail, 900);

      // No mês 2:
      // detalhado = 300
      // informado = null
      // considerado = 300
      // diferenca = 0
      assert.equal(summary.months[2].detailedAmount, 300);
      assert.equal(summary.months[2].informedAmount, null);
      assert.equal(summary.months[2].consideredAmount, 300);
      assert.equal(summary.months[2].differenceToDetail, 0);
    });
  });

  describe('AC-7: Integração Automática Cartões -> Módulo 1 (Despesas Variáveis)', () => {
    test('sincroniza consideredAmount nas linhas financeiras vinculadas', () => {
      const financialLines: FinancialCategoryLine[] = [
        {
          id: 'line-bb',
          tenantId: 'tenant-1',
          group: 'DESPESAS_VARIAVEIS',
          name: 'Cartão Banco do Brasil',
          profile: 'PF',
          linkedCardId: 'card-bb',
          months: {
            1: { month: 1, realized: 0, target: 0, settledAt: null },
            2: { month: 2, realized: 0, target: 0, settledAt: null },
          },
        },
      ];

      const summary = computeCardSummary(sampleCard, [], 2026, 1);
      // month 1 considered = 1200, month 2 considered = 0
      const synced = syncCardsToFinancialLines(financialLines, [summary]);

      assert.equal(synced[0].months[1].realized, 1200);
      assert.equal(synced[0].months[2].realized, 0);
    });
  });

  describe('AC-9: Consolidação por 14 Categorias', () => {
    test('consolida gastos por categoria e percentual do total', () => {
      const purchases: InstallmentPurchase[] = [
        {
          id: 'p1',
          tenantId: 'tenant-1',
          cardId: 'card-bb',
          purchaseDate: '2026-01-05',
          description: 'Mercado Mensal',
          category: 'Supermercado',
          totalAmount: 1000,
          installments: 1,
          firstInvoiceYear: 2026,
          firstInvoiceMonth: 1,
        },
        {
          id: 'p2',
          tenantId: 'tenant-1',
          cardId: 'card-bb',
          purchaseDate: '2026-01-10',
          description: 'Posto Shell',
          category: 'Combustível',
          totalAmount: 500,
          installments: 1,
          firstInvoiceYear: 2026,
          firstInvoiceMonth: 1,
        },
      ];

      const breakdown = computeCardCategoriesBreakdown(purchases, 2026);
      const mercado = breakdown.find((b) => b.category === 'Supermercado')!;
      const combustivel = breakdown.find((b) => b.category === 'Combustível')!;

      assert.equal(mercado.annualTotal, 1000);
      assert.equal(mercado.shareOfTotal, 0.67); // 1000 / 1500 ~ 0.6667 -> 0.67
      assert.equal(combustivel.annualTotal, 500);
      assert.equal(combustivel.shareOfTotal, 0.33); // 500 / 1500 ~ 0.3333 -> 0.33
    });
  });
});
