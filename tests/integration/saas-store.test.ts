import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SaaSStore } from '../../src/server/saas-store.ts';

describe('SaaSStore Multi-Tenant & Persistência (AC-1, AC-15)', () => {
  let store: SaaSStore;

  beforeEach(() => {
    store = new SaaSStore();
  });

  test('AC-1 & AC-2: Criação de Tenant com seed zerado e isolamento estrito', () => {
    const tenantA = store.createTenantWithSeed('Org Alpha', 'alpha-saas', 'PRO');
    const tenantB = store.createTenantWithSeed('Org Beta', 'beta-saas', 'FREE');

    assert.notEqual(tenantA.id, tenantB.id);

    // Listar linhas financeiras de Alpha
    const linesA = store.listFinancialLines(tenantA.id, 2026);
    assert.ok(linesA.length > 0);
    assert.ok(linesA.every((l) => l.tenantId === tenantA.id));

    // Listar linhas financeiras de Beta
    const linesB = store.listFinancialLines(tenantB.id, 2026);
    assert.ok(linesB.length > 0);
    assert.ok(linesB.every((l) => l.tenantId === tenantB.id));

    // Violação de isolamento: tentar acessar ou alterar dados com tenant incorreto
    assert.throws(
      () => {
        store.updateFinancialEntry(tenantA.id, linesB[0].id, 1, { realized: 500, target: 500, settledAt: null });
      },
      /Tenant isolation violation|NotFoundError/
    );
  });

  test('AC-7 & AC-14: Atualização de compras de cartão sincroniza com Módulo 1 e Módulo 4', () => {
    const tenant = store.createTenantWithSeed('Empresa Teste', 'empresa-teste', 'ENTERPRISE');

    // Registrar compra de cartão no Nubank PF
    const cards = store.listCards(tenant.id, 2026);
    const nuCard = cards.find((c) => c.card.name === 'Nubank PF')!;

    store.createPurchase(tenant.id, {
      cardId: nuCard.card.id,
      purchaseDate: '2026-03-10',
      description: 'Supermercado Mensal',
      category: 'Supermercado',
      totalAmount: 600,
      installments: 3,
      firstInvoiceYear: 2026,
      firstInvoiceMonth: 3,
    });

    // Consultar dashboard completo consolidado
    const dashboard = store.getDashboard(tenant.id, 2026, 3, '2026-03-15');

    // Módulo 2: O Nubank PF deve ter detalhado de 200 no mês 3
    const nuSummary = dashboard.cards.summaries.find((s) => s.card.id === nuCard.card.id)!;
    assert.equal(nuSummary.months[3].detailedAmount, 200);
    assert.equal(nuSummary.months[3].consideredAmount, 200);

    // Módulo 1: A linha vinculada ao cartão no Módulo 1 deve ter recebido os 200 automaticamente
    const linkedLine = dashboard.finance.lines.find((l) => l.linkedCardId === nuCard.card.id)!;
    assert.equal(linkedLine.months[3].realized, 200);
  });
});
