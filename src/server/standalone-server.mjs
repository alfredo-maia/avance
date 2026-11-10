/**
 * Servidor Standalone e Renderizador do Dashboard Web Multi-Tenant Avance (AC-16 / ADR-0002)
 * Fornece API REST/JSON (/api/v1/...) e aplicação web com os 4 módulos integrados.
 */

import http from 'node:http';
import { URL } from 'node:url';
import { SaaSStore } from './saas-store.ts';
import { createApiRouteHandlers } from '../app/api/v1/route-handlers.ts';

/**
 * Popula o tenant demonstrativo com dados ilustrativos cobrindo os 4 módulos,
 * 4 tipos de indicadores e status operacionais.
 */
function seedDemoData(store) {
  const tenant = store.createTenantWithSeed('Avance Matriz', 'avance-matriz', 'PRO');
  const tenantId = tenant.id;

  // Lançamentos financeiros demonstrativos no Módulo 1 (Controle Finanças)
  const dash = store.getDashboard(tenantId, 2026, 1, '2026-01-15');
  const lines = dash.finance.lines;

  // Recursos Financeiros (saldo)
  const recBank = lines.find((l) => l.name === 'Banco do Brasil Corrente');
  if (recBank) {
    store.updateFinancialEntry(tenantId, recBank.id, 1, { realized: 25000, target: 20000 });
    store.updateFinancialEntry(tenantId, recBank.id, 2, { realized: 27500, target: 25000 });
  }
  const recNu = lines.find((l) => l.name === 'Nubank PF CDB/Caixinha');
  if (recNu) {
    store.updateFinancialEntry(tenantId, recNu.id, 1, { realized: 80000, target: 75000 });
  }

  // Receitas (com liquidação e metas)
  const salLine = lines.find((l) => l.name === 'Salário Holerite Bruto');
  if (salLine) {
    for (let m = 1; m <= 12; m++) {
      store.updateFinancialEntry(tenantId, salLine.id, m, {
        target: 12000,
        realized: m <= 2 ? 12000 : 0,
        settledAt: m <= 2 ? `2026-0${m}-05` : null,
      });
    }
  }

  // Despesas Fixas (pago e atrasado)
  const planoSaude = lines.find((l) => l.name === 'Plano de saúde');
  if (planoSaude) {
    store.updateFinancialEntry(tenantId, planoSaude.id, 1, {
      target: 1200,
      realized: 1200,
      settledAt: '2026-01-10',
    });
  }
  const iptul = lines.find((l) => l.name === 'ITU/IPTU');
  if (iptul) {
    // Atrasado em Jan (vencimento dia 10, ref 15, sem settledAt)
    store.updateFinancialEntry(tenantId, iptul.id, 1, {
      target: 450,
      realized: 450,
      settledAt: null,
    });
  }

  // Despesas Variáveis
  const luz = lines.find((l) => l.name === 'Energia elétrica');
  if (luz) {
    store.updateFinancialEntry(tenantId, luz.id, 1, {
      target: 350,
      realized: 340,
      settledAt: '2026-01-12',
    });
  }

  // Módulo 2: Compras de Cartão de Crédito e Faturas
  const bbCard = dash.cards.summaries.find((c) => c.card.name === 'Banco do Brasil');
  if (bbCard) {
    store.createPurchase(tenantId, {
      cardId: bbCard.card.id,
      purchaseDate: '2026-01-05',
      description: 'Notebook Dell Pro',
      category: 'Educação',
      totalAmount: 6000,
      installments: 10,
      firstInvoiceYear: 2026,
      firstInvoiceMonth: 1,
    });
    // Fatura informada em Jan
    store.updateCardInvoice(tenantId, bbCard.card.id, 1, 1850);
  }

  const nuPfCard = dash.cards.summaries.find((c) => c.card.name === 'Nubank PF');
  if (nuPfCard) {
    store.createPurchase(tenantId, {
      cardId: nuPfCard.card.id,
      purchaseDate: '2026-01-10',
      description: 'Compras Supermercado',
      category: 'Supermercado',
      totalAmount: 1200,
      installments: 1,
      firstInvoiceYear: 2026,
      firstInvoiceMonth: 1,
    });
    store.createPurchase(tenantId, {
      cardId: nuPfCard.card.id,
      purchaseDate: '2026-06-15',
      description: 'Smartphone Galaxy',
      category: 'Assinaturas/Serviços',
      totalAmount: 4800,
      installments: 12,
      firstInvoiceYear: 2026,
      firstInvoiceMonth: 6,
    });
  }

  // Módulo 3: Propósitos e Metas (4 Categorias)
  store.createGoal(tenantId, {
    year: 2026,
    code: 'MET-01',
    category: 'FINANCEIRA',
    title: 'Constituir Reserva de Emergência de 6 Meses',
    deadline: '2026-12-31',
    targetAmount: 50000,
    realized: false,
    resultComment: 'Aportes regulares em CDB/Caixinha',
  });

  store.createGoal(tenantId, {
    year: 2026,
    code: 'MET-02',
    category: 'DESENVOLVIMENTO_PESSOAL',
    title: 'Concluir Certificação Profissional Cloud Architecture',
    deadline: '2026-08-30',
    targetAmount: null,
    realized: true,
    resultComment: 'Certificação aprovada com distinção em Jan/2026',
  });

  store.createGoal(tenantId, {
    year: 2026,
    code: 'MET-03',
    category: 'FISICA_SAUDE',
    title: 'Reduzir Gordura Corporal para 15% com Treino Regular',
    deadline: '2026-12-31',
    targetAmount: 15,
    realized: false,
    resultComment: 'Acompanhamento nutricional ativo',
  });

  store.createGoal(tenantId, {
    year: 2026,
    code: 'MET-04',
    category: 'DIVERSAO',
    title: 'Viagem de Férias em Família no Fim de Ano',
    deadline: '2026-12-20',
    targetAmount: 12000,
    realized: false,
    resultComment: 'Planejamento e passagens reservadas',
  });

  store.createExtraAchievement(tenantId, {
    year: 2026,
    category: 'FINANCEIRA',
    title: 'Bônus Executivo Extraordinário por Antecipação de Metas',
    amount: 15000,
    realized: true,
    notes: 'Reconhecimento corporativo com aporte total em investimentos (2026-01-20)',
  });

  // Módulo 4: Plano de Ação (4 Tipos de Acompanhamento: SOMA, LIMITE_MAXIMO, ULTIMO_VALOR_REDUZIR, MARCO_TEXTO)
  // SOMA
  store.createActionPlanIndicator(tenantId, {
    goalId: 'MET-01',
    year: 2026,
    name: 'Aportes Mensais em Investimentos (SOMA)',
    deadline: '2026-12-31',
    trackingType: 'SOMA',
    targetValue: 24000,
    completed: false,
    months: {
      1: { month: 1, plannedValue: 2000, realizedValue: 2500 },
      2: { month: 2, plannedValue: 2000, realizedValue: 2000 },
      3: { month: 3, plannedValue: 2000, realizedValue: 0 },
    },
    linkedFinanceCategoryId: recNu?.id,
  });

  // LIMITE_MAXIMO
  store.createActionPlanIndicator(tenantId, {
    goalId: 'MET-04',
    year: 2026,
    name: 'Teto Mensal de Gastos com Lazer (LIMITE_MAXIMO)',
    deadline: '2026-12-31',
    trackingType: 'LIMITE_MAXIMO',
    targetValue: 800,
    completed: false,
    months: {
      1: { month: 1, plannedValue: 800, realizedValue: 650 },
      2: { month: 2, plannedValue: 800, realizedValue: 720 },
      3: { month: 3, plannedValue: 800, realizedValue: 0 },
    },
  });

  // ULTIMO_VALOR_REDUZIR
  store.createActionPlanIndicator(tenantId, {
    goalId: 'MET-03',
    year: 2026,
    name: 'Percentual de Gordura Corporal % (ULTIMO_VALOR_REDUZIR)',
    deadline: '2026-12-31',
    trackingType: 'ULTIMO_VALOR_REDUZIR',
    targetValue: 15,
    completed: false,
    months: {
      1: { month: 1, plannedValue: 22, realizedValue: 20.5 },
      2: { month: 2, plannedValue: 21, realizedValue: 19.8 },
      3: { month: 3, plannedValue: 20, realizedValue: 0 },
    },
  });

  // MARCO_TEXTO
  store.createActionPlanIndicator(tenantId, {
    goalId: 'MET-02',
    year: 2026,
    name: 'Conclusão de Módulos e Simulados (MARCO_TEXTO)',
    deadline: '2026-08-30',
    trackingType: 'MARCO_TEXTO',
    targetValue: null,
    completed: true,
    months: {
      1: { month: 1, plannedValue: null, realizedValue: null, plannedText: 'Módulos 1 e 2', realizedText: 'Concluído com nota máxima' },
      2: { month: 2, plannedValue: null, realizedValue: null, plannedText: 'Módulos 3 e 4', realizedText: 'Em andamento' },
    },
  });

  return tenant;
}

const CANONICAL_CARD_CATEGORIES = [
  'Supermercado',
  'Alimentação/Restaurante',
  'Combustível',
  'Veículo/Moto',
  'Saúde/Farmácia',
  'Casa/Manutenção',
  'Vestuário',
  'Lazer/Viagem',
  'Assinaturas/Serviços',
  'Educação',
  'Presentes',
  'Empresa (PJ)',
  'Impostos/Taxas',
  'Outros',
];

/**
 * Renderiza o HTML completo da aplicação SaaS Multi-Tenant
 */
function renderDashboardHtml(initialData) {
  const { tenant, referenceYear, referenceMonth, finance, cards, goals, actionPlan, tenants } = initialData;
  const kpis = finance.kpis;

  const investmentPct = Math.round((kpis.investmentRate || 0) * 100);
  const cardsPct = Math.round((kpis.cardsToRevenueRate || 0) * 100);
  const paidBillsPct = Math.round((kpis.paidBillsPercentage || 0) * 100);
  const patrimonyBalance = kpis.totalAssetsLastBalance || 0;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Avance SaaS Multi-Tenant — Dashboard Financeiro e de Metas</title>
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    :root {
      --bg: #f8fafc;
      --surface: #ffffff;
      --surface-subtle: #f1f5f9;
      --text: #0f172a;
      --text-muted: #475569;
      --text-light: #64748b;
      --border: #e2e8f0;
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --primary-light: #3b82f6;
      --secondary: #7c3aed;
      --success-bg: #dcfce7;
      --success-text: #16a34a;
      --warning-bg: #fef3c7;
      --warning-text: #d97706;
      --danger-bg: #fee2e2;
      --danger-text: #dc2626;
      --focus-ring: #2563eb;
      --font: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

      /* Material UI (MUI) Design Tokens */
      --mui-radius: 8px;
      --mui-card-radius: 12px;
      --mui-card-border: 1px solid #e2e8f0;
      --mui-card-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04);
      --mui-card-shadow-hover: 0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 4px 10px -2px rgba(15, 23, 42, 0.05);
      --mui-dialog-radius: 12px;
      --mui-dialog-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25);
      --modal-backdrop-bg: rgba(15, 23, 42, 0.5);
      --modal-backdrop-blur: 4px;

      /* Tokens legados mapeados para Material UI para total compatibilidade retroativa */
      --lens-blur: 0px;
      --lens-saturate: 100%;
      --lens-contrast: 100%;
      --lens-rim: var(--mui-card-border);
      --lens-specular: none;
      --lens-shadow: var(--mui-card-shadow);
      --dock-blur: 0px;
      --dock-bg: #ffffff;
      --dock-border: 1px solid #e2e8f0;
      --dock-active-bg: rgba(37, 99, 235, 0.08);
      --dock-active-shadow: none;
      --modal-dialog-bg: #ffffff;
      --modal-dialog-shadow: var(--mui-dialog-shadow);
    }
    body {
      font-family: var(--font);
      background-color: var(--bg);
      background: #f8fafc;
      color: var(--text);
      line-height: 1.5;
      min-height: 100vh;
      overflow-x: hidden;
      width: 100%;
    }
    .app-wrapper {
      width: 100%;
      max-width: 1360px;
      margin: 0 auto;
      padding: 1rem;
      box-sizing: border-box;
    }
    header.saas-header {
      background: #ffffff;
      border: var(--mui-card-border);
      border-radius: var(--mui-card-radius);
      padding: 1rem 1.25rem;
      margin-bottom: 1.25rem;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      box-shadow: var(--mui-card-shadow);
    }
    .header-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .brand-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.6rem;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 9999px;
    }
    .badge-plan {
      background: rgba(224, 231, 255, 0.8);
      color: #3730a3;
      border: 1px solid rgba(199, 210, 254, 0.9);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      box-shadow: inset 0 1px 1px 0 rgba(255, 255, 255, 0.75);
    }
    .header-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .control-group {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .control-group label {
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-muted);
    }
    select, input, button {
      font-family: inherit;
      font-size: 0.875rem;
      padding: 0.4rem 0.65rem;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.85);
      color: var(--text);
    }
    select:focus, input:focus, button:focus {
      outline: 2px solid var(--focus-ring);
      outline-offset: 2px;
    }
    button.btn-primary {
      background: var(--primary);
      color: #ffffff;
      border: none;
      font-weight: 600;
      cursor: pointer;
      border-radius: 8px;
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
      transition: background 0.15s, transform 0.15s;
    }
    button.btn-primary:hover {
      background: var(--primary-hover);
      transform: translateY(-1px);
    }
    button.btn-secondary {
      background: var(--surface-subtle);
      color: var(--text);
      cursor: pointer;
      border-radius: 8px;
    }
    button.btn-danger {
      background: rgba(239, 68, 68, 0.15);
      color: var(--danger-text, #ef4444);
      border: 1px solid rgba(239, 68, 68, 0.3);
      cursor: pointer;
      border-radius: 8px;
      font-weight: 500;
      transition: background 0.15s, transform 0.15s;
    }
    button.btn-danger:hover {
      background: rgba(239, 68, 68, 0.25);
      transform: translateY(-1px);
    }
    .liquid-lens-modal-wide {
      max-width: 680px;
      max-height: 85vh;
      overflow-y: auto;
    }
    .months-balance-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 0.6rem;
      max-height: 280px;
      overflow-y: auto;
      padding: 0.6rem;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      margin-top: 0.35rem;
    }
    .month-balance-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      background: rgba(255, 255, 255, 0.3);
      padding: 0.4rem;
      border-radius: 6px;
      font-size: 0.75rem;
    }
    .month-balance-item label {
      font-weight: 600;
      color: var(--text-muted);
    }
    .month-balance-item input {
      font-size: 0.8rem;
      padding: 0.25rem 0.35rem;
    }

    /* Material UI (MUI) Tabs & Navigation */
    nav.tab-nav,
    .liquid-lens-dock {
      display: inline-flex;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
      padding: 0.35rem 0.5rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: var(--mui-radius);
      box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.05);
      overflow-x: auto;
      max-width: 100%;
      -webkit-overflow-scrolling: touch;
    }
    .tab-btn,
    .liquid-lens-dock-tab {
      padding: 0.55rem 1.15rem;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      border-radius: 4px;
      font-weight: 600;
      font-size: 0.925rem;
      color: var(--text-muted);
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }
    .tab-btn:hover,
    .liquid-lens-dock-tab:hover {
      background: rgba(37, 99, 235, 0.04);
      color: var(--text);
    }
    .tab-btn[aria-selected="true"],
    .liquid-lens-dock-tab-active {
      background: rgba(37, 99, 235, 0.08);
      color: var(--primary);
      border-bottom: 2px solid var(--primary);
    }
    /* Tab Panels */
    .tab-panel {
      display: none;
    }
    .tab-panel[aria-hidden="false"] {
      display: block;
    }
    /* Material UI (MUI) KPI Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .kpi-card,
    .liquid-lens-card {
      position: relative;
      background: #ffffff;
      border: var(--mui-card-border);
      border-radius: var(--mui-card-radius);
      padding: 1.1rem;
      box-shadow: var(--mui-card-shadow);
      overflow: hidden;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .kpi-card:hover,
    .liquid-lens-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--mui-card-shadow-hover);
    }
    .kpi-card::before,
    .liquid-lens-card::before {
      display: none;
    }
    .kpi-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted);
      letter-spacing: 0.02em;
      margin-bottom: 0.35rem;
    }
    .kpi-value {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text);
    }
    .kpi-value.positive { color: var(--success-text); }
    .kpi-value.negative { color: var(--danger-text); }
    .kpi-value.warning { color: var(--warning-text); }
    /* Sections */
    .section-card {
      background: #ffffff;
      border: var(--mui-card-border);
      border-radius: var(--mui-card-radius);
      padding: 1.25rem;
      margin-bottom: 1.5rem;
      box-shadow: var(--mui-card-shadow);
      width: 100%;
      box-sizing: border-box;
      position: relative;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .section-title {
      font-size: 1.1rem;
      font-weight: 700;
    }
    /* Tables */
    .table-responsive {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      margin-bottom: 1rem;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
      text-align: left;
    }
    table.data-table th, table.data-table td {
      padding: 0.55rem 0.75rem;
      border: 1px solid var(--border);
      white-space: nowrap;
    }
    table.data-table th {
      background: var(--surface-subtle);
      font-weight: 600;
      color: var(--text-muted);
    }
    .finance-group-header {
      background: #e2e8f0;
      font-weight: 700;
      color: #1e293b;
    }
    /* Grade Inline 12 Meses (Liquid Lens) */
    .cell-inline-input {
      background: transparent;
      border: 1px solid transparent;
      border-radius: 4px;
      color: inherit;
      padding: 0.35rem 0.5rem;
      font-size: 0.85rem;
      font-family: inherit;
      width: 100%;
      box-sizing: border-box;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .cell-inline-input:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(203, 213, 225, 0.4);
    }
    .cell-inline-input:focus {
      outline: none;
      background: rgba(255, 255, 255, 0.12);
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.25);
    }
    .input-inline-name {
      text-align: left;
      font-weight: 600;
      min-width: 160px;
    }
    .input-inline-month {
      text-align: right;
      min-width: 75px;
    }
    .select-inline-profile {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 4px;
      color: inherit;
      padding: 0.25rem 0.4rem;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }
    .cell-total-anual {
      font-weight: 700;
      text-align: right;
      min-width: 95px;
      color: var(--text-primary);
    }
    .cell-actions {
      text-align: center;
      min-width: 75px;
    }
    .badge-status {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .status-ok { background: var(--success-bg); color: var(--success-text); }
    .status-pending { background: var(--warning-bg); color: var(--warning-text); }
    .status-overdue { background: var(--danger-bg); color: var(--danger-text); }
    .status-empty { background: #e2e8f0; color: #64748b; }
    /* Cards in Module 2 */
    .cards-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .credit-card-item {
      background: var(--surface);
      backdrop-filter: blur(var(--lens-blur)) saturate(var(--lens-saturate));
      -webkit-backdrop-filter: blur(var(--lens-blur)) saturate(var(--lens-saturate));
      border: var(--lens-rim);
      border-radius: 12px;
      padding: 1rem;
      box-shadow: var(--lens-shadow), var(--lens-specular);
    }
    .card-header-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .progress-bar-bg {
      background: #e2e8f0;
      border-radius: 4px;
      height: 8px;
      overflow: hidden;
      margin: 0.5rem 0;
    }
    .progress-bar-fill {
      background: var(--primary);
      height: 100%;
    }
    /* Charts */
    .chart-container {
      width: 100%;
      height: auto;
      max-height: 320px;
    }
    /* Material UI (MUI) Dialog & Backdrop */
    .modal,
    .liquid-lens-modal-backdrop {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: var(--modal-backdrop-bg);
      backdrop-filter: blur(var(--modal-backdrop-blur));
      -webkit-backdrop-filter: blur(var(--modal-backdrop-blur));
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
      transition: opacity 0.25s ease;
    }
    .modal.open,
    .liquid-lens-modal-backdrop.open {
      display: flex;
    }
    .modal-content,
    .liquid-lens-modal {
      position: relative;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: var(--mui-dialog-radius);
      padding: 1.75rem;
      width: 100%;
      max-width: 480px;
      box-shadow: var(--mui-dialog-shadow);
      overflow: hidden;
    }
    .modal-content::before,
    .liquid-lens-modal::before {
      display: none;
    }
    .modal-title {
      font-size: 1.15rem;
      font-weight: 700;
      margin-bottom: 1rem;
    }
    .form-group {
      margin-bottom: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 1.25rem;
    }
    /* Responsive tweaks for 360px */
    @media (max-width: 600px) {
      .app-wrapper { padding: 0.5rem; }
      header.saas-header { padding: 0.75rem; }
      .header-controls { width: 100%; justify-content: flex-start; }
      .kpi-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body class="mui-theme liquid-lens-theme">
  <div class="app-wrapper">
    <!-- Header / Administração SaaS Multi-Tenant -->
    <header class="saas-header" role="banner">
      <div class="header-brand">
        <h1 class="brand-title">Avance SaaS</h1>
        <span id="plan-badge" class="badge badge-plan">${tenant.plan}</span>
        <span id="ds-badge" class="badge" style="background: rgba(37, 99, 235, 0.12); color: #2563eb; border: 1px solid rgba(37, 99, 235, 0.35); font-size: 0.75rem; font-weight: 600;">Material UI (MUI)</span>
        <button id="btn-new-tenant" class="btn-primary" aria-haspopup="dialog" aria-controls="modal-new-tenant">+ Novo Tenant</button>
      </div>

      <div class="header-controls">
        <div class="control-group">
          <label for="tenant-select">Tenant:</label>
          <select id="tenant-select" aria-label="Selecione o Tenant ativo">
            ${tenants.map((t) => `<option value="${t.id}" ${t.id === tenant.id ? 'selected' : ''}>${t.name}</option>`).join('')}
          </select>
        </div>

        <div class="control-group">
          <label for="profile-filter">Visão:</label>
          <select id="profile-filter" aria-label="Filtrar por titularidade PF ou PJ">
            <option value="ALL">Todos (PF + PJ)</option>
            <option value="PF">Pessoa Física (PF)</option>
            <option value="PJ">Pessoa Jurídica (PJ)</option>
          </select>
        </div>

        <div class="control-group">
          <label for="year-select">Ano:</label>
          <select id="year-select" aria-label="Ano de referência">
            <option value="2026" ${referenceYear === 2026 ? 'selected' : ''}>2026</option>
            <option value="2025" ${referenceYear === 2025 ? 'selected' : ''}>2025</option>
            <option value="2027" ${referenceYear === 2027 ? 'selected' : ''}>2027</option>
          </select>
        </div>

        <div class="control-group">
          <label for="month-select">Mês:</label>
          <select id="month-select" aria-label="Mês de referência">
            ${['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
              .map((m, idx) => `<option value="${idx + 1}" ${idx + 1 === referenceMonth ? 'selected' : ''}>${m}</option>`)
              .join('')}
          </select>
        </div>
      </div>
    </header>

    <!-- Navegação por Abas (4 Módulos) / Liquid Lens Dock -->
    <nav class="tab-nav liquid-lens-dock" role="tablist" aria-label="Navegação dos 4 Módulos">
      <button id="tab-btn-finance" class="tab-btn liquid-lens-dock-tab liquid-lens-dock-tab-active" role="tab" aria-selected="true" aria-controls="tab-finance">1. Controle Finanças</button>
      <button id="tab-btn-cards" class="tab-btn liquid-lens-dock-tab" role="tab" aria-selected="false" aria-controls="tab-cards">2. Cartões de Crédito</button>
      <button id="tab-btn-goals" class="tab-btn liquid-lens-dock-tab" role="tab" aria-selected="false" aria-controls="tab-goals">3. Propósitos e Metas</button>
      <button id="tab-btn-action-plan" class="tab-btn liquid-lens-dock-tab" role="tab" aria-selected="false" aria-controls="tab-action-plan">4. Plano de Ação</button>
    </nav>

    <!-- ABA 1: CONTROLE FINANÇAS -->
    <section id="tab-finance" class="tab-panel" role="tabpanel" aria-labelledby="tab-btn-finance" aria-hidden="false">
      <!-- 9 Cards de KPIs Liquid Lens -->
      <div class="kpi-grid">
        <div id="kpi-received" class="kpi-card liquid-lens-card">
          <div class="kpi-label">Recebido no Mês</div>
          <div class="kpi-value positive">R$ ${kpis.receivedInMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div id="kpi-to-receive" class="kpi-card liquid-lens-card">
          <div class="kpi-label">A Receber no Mês</div>
          <div class="kpi-value">R$ ${kpis.toReceiveInMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div id="kpi-paid" class="kpi-card liquid-lens-card">
          <div class="kpi-label">Pago no Mês</div>
          <div class="kpi-value">R$ ${kpis.paidInMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div id="kpi-to-pay" class="kpi-card liquid-lens-card">
          <div class="kpi-label">A Pagar no Mês</div>
          <div class="kpi-value">R$ ${kpis.toPayInMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div id="kpi-overdue-count" class="kpi-card liquid-lens-card">
          <div class="kpi-label">Contas Atrasadas</div>
          <div class="kpi-value ${kpis.overdueCount > 0 ? 'negative' : ''}">${kpis.overdueCount} contas</div>
        </div>
        <div id="kpi-overdue-amount" class="kpi-card liquid-lens-card">
          <div class="kpi-label">Valor em Atraso</div>
          <div class="kpi-value ${kpis.overdueAmount > 0 ? 'negative' : ''}">R$ ${kpis.overdueAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div id="kpi-month-result" class="kpi-card liquid-lens-card">
          <div class="kpi-label">Resultado Final do Mês</div>
          <div class="kpi-value ${kpis.monthFinalResult >= 0 ? 'positive' : 'negative'}">R$ ${kpis.monthFinalResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div id="kpi-accumulated-result" class="kpi-card liquid-lens-card">
          <div class="kpi-label">Resultado Acumulado Ano</div>
          <div class="kpi-value ${kpis.accumulatedResultYear >= 0 ? 'positive' : 'negative'}">R$ ${kpis.accumulatedResultYear.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div id="kpi-patrimony-balance" class="kpi-card liquid-lens-card">
          <div class="kpi-label">Patrimônio (Último Saldo)</div>
          <div class="kpi-value">R$ ${patrimonyBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      <!-- Resumo de Indicadores e Gráficos -->
      <div class="section-card liquid-lens">
        <div class="section-header">
          <h2 class="section-title">Evolução Mensal e Indicadores Resumo</h2>
        </div>
        <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem;">
          <div class="kpi-card liquid-lens-card" style="flex: 1; min-width: 200px;">
            <div class="kpi-label">Taxa de Investimento</div>
            <div id="indicator-investment-rate" class="kpi-value">${investmentPct}%</div>
          </div>
          <div class="kpi-card liquid-lens-card" style="flex: 1; min-width: 200px;">
            <div class="kpi-label">Cartões ÷ Rendimento</div>
            <div id="indicator-cards-ratio" class="kpi-value">${cardsPct}%</div>
          </div>
          <div class="kpi-card liquid-lens-card" style="flex: 1; min-width: 200px;">
            <div class="kpi-label">% Contas Pagas</div>
            <div id="indicator-paid-percentage" class="kpi-value">${paidBillsPct}%</div>
          </div>
        </div>

        <!-- Gráfico SVG Acessível -->
        <div id="chart-monthly-evolution" class="chart-container" role="img" aria-label="Gráfico de Evolução Financeira Mensal Jan a Dez">
          <svg viewBox="0 0 800 240" width="100%" height="240" xmlns="http://www.w3.org/2000/svg">
            <title>Evolução Mensal das Finanças</title>
            <desc>Comparativo de Receitas, Investimentos, Despesas Fixas e Variáveis de Janeiro a Dezembro.</desc>
            <!-- Linhas de grade -->
            <line x1="50" y1="20" x2="780" y2="20" stroke="#e2e8f0" stroke-width="1" />
            <line x1="50" y1="80" x2="780" y2="80" stroke="#e2e8f0" stroke-width="1" />
            <line x1="50" y1="140" x2="780" y2="140" stroke="#e2e8f0" stroke-width="1" />
            <line x1="50" y1="200" x2="780" y2="200" stroke="#cbd5e1" stroke-width="1.5" />
            <!-- Barras ilustrativas para Jan..Dez -->
            ${Array.from({ length: 12 }, (_, i) => {
              const x = 70 + i * 58;
              return `
                <g class="chart-month-col" data-month="${i + 1}">
                  <rect x="${x}" y="90" width="12" height="110" fill="#2563eb" rx="2"><title>Mês ${i + 1} - Receita</title></rect>
                  <rect x="${x + 14}" y="130" width="12" height="70" fill="#10b981" rx="2"><title>Mês ${i + 1} - Investimento</title></rect>
                  <rect x="${x + 28}" y="150" width="12" height="50" fill="#ef4444" rx="2"><title>Mês ${i + 1} - Despesas</title></rect>
                  <text x="${x + 24}" y="220" font-size="11" text-anchor="middle" fill="#64748b">${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][i]}</text>
                </g>
              `;
            }).join('')}
          </svg>
        </div>
      </div>

      <!-- Matriz Jan..Dez agrupada pelos 5 Grupos -->
      <div class="section-card">
        <div class="section-header">
          <h2 class="section-title">Matriz Financeira (Jan a Dez) — 5 Grupos Estruturais</h2>
        </div>
        <div class="table-responsive">
          <table id="table-finance-matrix" class="data-table" aria-label="Matriz financeira Jan a Dez">
            <thead>
              <tr>
                <th scope="col" style="min-width: 170px;">Conta / Linha</th>
                <th scope="col" style="width: 70px;">Perfil</th>
                <th scope="col" style="min-width: 75px;">Jan</th>
                <th scope="col" style="min-width: 75px;">Fev</th>
                <th scope="col" style="min-width: 75px;">Mar</th>
                <th scope="col" style="min-width: 75px;">Abr</th>
                <th scope="col" style="min-width: 75px;">Mai</th>
                <th scope="col" style="min-width: 75px;">Jun</th>
                <th scope="col" style="min-width: 75px;">Jul</th>
                <th scope="col" style="min-width: 75px;">Ago</th>
                <th scope="col" style="min-width: 75px;">Set</th>
                <th scope="col" style="min-width: 75px;">Out</th>
                <th scope="col" style="min-width: 75px;">Nov</th>
                <th scope="col" style="min-width: 75px;">Dez</th>
                <th scope="col" style="min-width: 100px; text-align: right;">Total Anual</th>
                <th scope="col" style="width: 80px; text-align: center;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${['RECURSOS_FINANCEIROS', 'RECEITAS', 'INVESTIMENTOS', 'DESPESAS_FIXAS', 'DESPESAS_VARIAVEIS'].map((grp) => {
                const groupLines = finance.lines.filter((l) => l.group === grp);
                const groupLabel = {
                  RECURSOS_FINANCEIROS: 'Recursos Financeiros (Regra do Último Saldo Informado)',
                  RECEITAS: 'Receitas',
                  INVESTIMENTOS: 'Investimentos',
                  DESPESAS_FIXAS: 'Despesas Fixas',
                  DESPESAS_VARIAVEIS: 'Despesas Variáveis',
                }[grp];
                const btnConfig = {
                  RECURSOS_FINANCEIROS: { id: 'btn-new-resource', label: '+ Nova Linha' },
                  RECEITAS: { id: 'btn-new-receitas', label: '+ Nova Linha' },
                  INVESTIMENTOS: { id: 'btn-new-investimentos', label: '+ Nova Linha' },
                  DESPESAS_FIXAS: { id: 'btn-new-despesas-fixas', label: '+ Nova Linha' },
                  DESPESAS_VARIAVEIS: { id: 'btn-new-despesas-variaveis', label: '+ Nova Linha' },
                }[grp];

                return `
                  <tr class="finance-group-header" data-header-group="${grp}">
                    <td colspan="16">
                      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <span><strong>${groupLabel}</strong> (<span class="group-count" id="count-${grp}">${groupLines.length}</span> itens)</span>
                        <button type="button" id="${btnConfig.id}" class="btn-primary btn-add-finance-line btn-add-inline-line" data-group="${grp}" style="font-size: 0.8rem; padding: 0.35rem 0.75rem;">
                          ${btnConfig.label}
                        </button>
                      </div>
                    </td>
                  </tr>
                  ${groupLines.map((l) => {
                    return `
                      <tr data-line-id="${l.id}" data-profile="${l.profile}" data-group="${l.group}">
                        <td class="cell-name">
                          <input type="text" class="cell-inline-input input-inline-name" value="${l.name}" data-line-id="${l.id}" aria-label="Nome da Conta ${l.name}">
                        </td>
                        <td class="cell-profile">
                          <select class="select-inline-profile" data-line-id="${l.id}" aria-label="Perfil ${l.name}">
                            <option value="PF" ${l.profile === 'PF' ? 'selected' : ''}>PF</option>
                            <option value="PJ" ${l.profile === 'PJ' ? 'selected' : ''}>PJ</option>
                          </select>
                        </td>
                        ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                          const val = l.months[m]?.realized;
                          return `
                            <td class="cell-month" data-month="${m}">
                              <input type="number" step="0.01" class="cell-inline-input input-inline-month" data-line-id="${l.id}" data-month="${m}" data-group="${l.group}" value="${val !== undefined && val !== 0 ? val : ''}" placeholder="0,00" aria-label="Mês ${m} ${l.name}">
                            </td>
                          `;
                        }).join('')}
                        <td class="cell-total-anual" id="total-anual-${l.id}">
                          <strong>R$ ${l.totalRealized.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                        </td>
                        <td class="cell-actions" style="white-space: nowrap;">
                          <button type="button" class="btn-danger btn-delete-resource btn-delete-line" data-line-id="${l.id}" data-line-name="${l.name}" data-line-group="${l.group}" title="Excluir Linha">Excluir</button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- ABA 2: CARTÕES DE CRÉDITO -->
    <section id="tab-cards" class="tab-panel" role="tabpanel" aria-labelledby="tab-btn-cards" aria-hidden="true">
      <div class="section-card">
        <div class="section-header">
          <h2 class="section-title">Painel de Cartões Cadastrados</h2>
        </div>
        <div id="panel-cards" class="cards-list">
          ${cards.summaries.map((s) => {
            const usagePct = Math.round((s.limitUsageRatio || 0) * 100);
            return `
              <div class="credit-card-item" data-card-id="${s.card.id}">
                <div class="card-header-line">
                  <strong>${s.card.name}</strong>
                  <span class="badge badge-plan">${s.card.profile}</span>
                </div>
                <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">
                  Limite: R$ ${s.card.limitAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div style="font-size: 0.85rem; font-weight: 600;">
                  Fatura Atual: R$ ${s.currentMonthInvoice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${usagePct}% usado)
                </div>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" style="width: ${Math.min(usagePct, 100)}%;"></div>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">
                  Saldo remanescente pós-dezembro: R$ ${s.remainingAfterDecember.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Tabela de Reconciliação Mensal -->
      <div class="section-card">
        <div class="section-header">
          <h2 class="section-title">Reconciliação Mensal (Detalhado × Fatura Informada)</h2>
        </div>
        <div class="table-responsive">
          <table id="table-card-reconciliation" class="data-table" aria-label="Reconciliação de faturas de cartão">
            <thead>
              <tr>
                <th scope="col">Cartão</th>
                <th scope="col">Mês Ref. Detalhado</th>
                <th scope="col">Mês Ref. Fatura Informada</th>
                <th scope="col">► VALOR CONSIDERADO</th>
                <th scope="col">Saldo Pós-Dezembro</th>
              </tr>
            </thead>
            <tbody>
              ${cards.summaries.map((s) => {
                const monthRec = s.months[referenceMonth];
                return `
                  <tr>
                    <td><strong>${s.card.name}</strong> (${s.card.profile})</td>
                    <td>R$ ${(monthRec?.detailedAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td>${monthRec?.informedAmount !== null && monthRec?.informedAmount !== undefined ? `R$ ${monthRec.informedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}</td>
                    <td style="color: var(--primary); font-weight: 700;">► R$ ${(monthRec?.consideredAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td>R$ ${s.remainingAfterDecember.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Categorias Consolidadas (14 Categorias) -->
      <div class="section-card">
        <div class="section-header">
          <h2 class="section-title">Consolidado das 14 Categorias de Despesas de Cartão</h2>
        </div>
        <div class="table-responsive">
          <table id="table-card-categories" class="data-table" aria-label="14 categorias de gastos de cartão">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Categoria</th>
                <th scope="col">Total Gasto no Ano</th>
                <th scope="col">% do Total</th>
              </tr>
            </thead>
            <tbody>
              ${(() => {
                const breakdownMap = new Map(cards.categoryBreakdown.map((c) => [c.category, c]));
                const allCategories = CANONICAL_CARD_CATEGORIES.map((cat) => {
                  const found = breakdownMap.get(cat);
                  return {
                    category: cat,
                    annualTotal: found ? found.annualTotal : 0,
                    shareOfTotal: found ? found.shareOfTotal : 0,
                  };
                });
                return allCategories.map((c, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td>${c.category}</td>
                    <td>R$ ${c.annualTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td><strong>${Math.round((c.shareOfTotal || 0) * 100)}%</strong></td>
                  </tr>
                `).join('');
              })()}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Listagem de Compras Parceladas -->
      <div class="section-card">
        <div class="section-header">
          <h2 class="section-title">Compras Parceladas Registradas</h2>
        </div>
        <div id="list-purchases" class="table-responsive">
          <table class="data-table" aria-label="Compras parceladas">
            <thead>
              <tr>
                <th scope="col">Descrição</th>
                <th scope="col">Categoria</th>
                <th scope="col">Valor Total</th>
                <th scope="col">Parcelas</th>
                <th scope="col">1ª Fatura</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Notebook Dell Pro</td>
                <td>Educação</td>
                <td>R$ 6.000,00</td>
                <td>10x de R$ 600,00</td>
                <td>01/2026</td>
              </tr>
              <tr>
                <td>Smartphone Galaxy</td>
                <td>Assinaturas/Serviços</td>
                <td>R$ 4.800,00</td>
                <td>12x de R$ 400,00</td>
                <td>06/2026</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- ABA 3: PROPÓSITOS E METAS -->
    <section id="tab-goals" class="tab-panel" role="tabpanel" aria-labelledby="tab-btn-goals" aria-hidden="true">
      <div class="section-card">
        <div class="section-header">
          <h2 class="section-title">Atingimento Plurianual e Matriz por Categoria</h2>
        </div>
        <div id="panel-goals-distribution" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
          <div class="kpi-card">
            <div class="kpi-label">1. Financeira</div>
            <div class="kpi-value">${Math.round((goals.summary?.byCategoryRate?.FINANCEIRA || 0) * 100)}%</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">2. Desenvolvimento Pessoal</div>
            <div class="kpi-value">${Math.round((goals.summary?.byCategoryRate?.DESENVOLVIMENTO_PESSOAL || 0) * 100)}%</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">3. Física/Saúde</div>
            <div class="kpi-value">${Math.round((goals.summary?.byCategoryRate?.FISICA_SAUDE || 0) * 100)}%</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">4. Diversão</div>
            <div class="kpi-value">${Math.round((goals.summary?.byCategoryRate?.DIVERSAO || 0) * 100)}%</div>
          </div>
        </div>
      </div>

      <!-- Tabela de Metas -->
      <div class="section-card">
        <div class="section-header">
          <h2 class="section-title">Metas do Exercício (${referenceYear})</h2>
        </div>
        <div class="table-responsive">
          <table id="table-goals" class="data-table" aria-label="Metas cadastradas">
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Categoria</th>
                <th scope="col">Título</th>
                <th scope="col">Prazo</th>
                <th scope="col">Valor Alvo</th>
                <th scope="col">Situação</th>
                <th scope="col">Dias Restantes</th>
              </tr>
            </thead>
            <tbody>
              ${goals.items.map((g) => {
                const sitClass = g.situation === 'Atingida' ? 'status-ok' : g.situation === 'Em andamento' ? 'status-pending' : g.situation === 'Não atingida' ? 'status-overdue' : 'status-empty';
                return `
                  <tr>
                    <td><strong>${g.code}</strong></td>
                    <td>${g.category}</td>
                    <td>${g.title}</td>
                    <td>${g.deadline || 'Sem prazo'}</td>
                    <td>${g.targetAmount ? `R$ ${g.targetAmount.toLocaleString('pt-BR')}` : '—'}</td>
                    <td><span class="badge-status ${sitClass}">${g.situation}</span></td>
                    <td>${g.remainingDays !== null && g.remainingDays !== undefined ? `${g.remainingDays} dias` : '—'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Seção de Conquistas Extras -->
      <div id="section-extra-achievements" class="section-card">
        <div class="section-header">
          <h2 class="section-title">Conquistas Extras (Compensação)</h2>
        </div>
        <div class="table-responsive">
          <table class="data-table" aria-label="Conquistas extras">
            <thead>
              <tr>
                <th scope="col">Título</th>
                <th scope="col">Categoria</th>
                <th scope="col">Impacto Financeiro</th>
                <th scope="col">Data</th>
              </tr>
            </thead>
            <tbody>
              ${goals.extraAchievements.map((e) => `
                <tr>
                  <td><strong>${e.title}</strong></td>
                  <td>${e.category}</td>
                  <td>R$ ${(e.amount ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td>${e.notes || 'Realizada'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- ABA 4: PLANO DE AÇÃO DAS METAS -->
    <section id="tab-action-plan" class="tab-panel" role="tabpanel" aria-labelledby="tab-btn-action-plan" aria-hidden="true">
      <div class="section-card">
        <div class="section-header">
          <h2 class="section-title">Acompanhamento dos 4 Tipos de Indicadores Mensais</h2>
        </div>
        <div class="table-responsive">
          <table id="table-action-plan" class="data-table" aria-label="Indicadores do plano de ação">
            <thead>
              <tr>
                <th scope="col">Meta</th>
                <th scope="col">Indicador</th>
                <th scope="col">Tipo de Acompanhamento</th>
                <th scope="col">Meta/Alvo</th>
                <th scope="col">% Atingido</th>
                <th scope="col">Situação</th>
                <th scope="col">Vínculo Controle Finanças</th>
              </tr>
            </thead>
            <tbody>
              ${actionPlan.indicators.map((ind) => {
                const sitClass = ind.situation === 'Concluída' || ind.situation === 'No alvo' ? 'status-ok' : ind.situation === 'Em andamento' ? 'status-pending' : 'status-overdue';
                const pct = Math.round((ind.achievementRatio || 0) * 100);
                return `
                  <tr>
                    <td><strong>${ind.goalId}</strong></td>
                    <td>${ind.name}</td>
                    <td><span class="badge badge-plan">${ind.trackingType}</span></td>
                    <td>${ind.targetValue ?? '—'}</td>
                    <td><strong>${pct}%</strong></td>
                    <td><span class="badge-status ${sitClass}">${ind.situation}</span></td>
                    <td>${ind.linkedFinanceCategoryId ? '🔗 Vinculado a Controle Finanças' : '—'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Modal Novo Tenant / Liquid Lens Modal -->
    <div id="modal-new-tenant" class="modal liquid-lens-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-tenant-title">
      <div class="modal-content liquid-lens-modal">
        <h3 id="modal-tenant-title" class="modal-title">Cadastrar Novo Tenant</h3>
        <form id="form-new-tenant">
          <div class="form-group">
            <label for="input-tenant-name">Nome da Empresa / Tenant:</label>
            <input type="text" id="input-tenant-name" name="name" required placeholder="Ex: Minha Empresa Ltda">
          </div>
          <div class="form-group">
            <label for="select-tenant-plan">Plano de Assinatura:</label>
            <select id="select-tenant-plan" name="plan">
              <option value="PRO">PRO</option>
              <option value="FREE">FREE</option>
              <option value="ENTERPRISE">ENTERPRISE</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" id="btn-cancel-tenant" class="btn-secondary">Cancelar</button>
            <button type="submit" id="btn-submit-tenant" class="btn-primary">Criar Tenant</button>
          </div>
        </form>
      </div>
    </div>

  </div>

  <!-- Script Cliente Interativo e Reativo -->
  <script>
    // Tab switching com acessibilidade por teclado
    const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
    const tabPanels = Array.from(document.querySelectorAll('.tab-panel'));

    function activateTab(btn) {
      tabButtons.forEach(b => {
        b.setAttribute('aria-selected', 'false');
        b.classList.remove('liquid-lens-dock-tab-active');
      });
      tabPanels.forEach(p => {
        p.setAttribute('aria-hidden', 'true');
      });

      btn.setAttribute('aria-selected', 'true');
      btn.classList.add('liquid-lens-dock-tab-active');
      const targetId = btn.getAttribute('aria-controls');
      const panel = document.getElementById(targetId);
      if (panel) {
        panel.setAttribute('aria-hidden', 'false');
      }
    }

    tabButtons.forEach((btn, index) => {
      btn.addEventListener('click', () => activateTab(btn));
      btn.addEventListener('keydown', (e) => {
        let newIndex = null;
        if (e.key === 'ArrowRight') {
          newIndex = (index + 1) % tabButtons.length;
        } else if (e.key === 'ArrowLeft') {
          newIndex = (index - 1 + tabButtons.length) % tabButtons.length;
        } else if (e.key === 'Home') {
          newIndex = 0;
        } else if (e.key === 'End') {
          newIndex = tabButtons.length - 1;
        }

        if (newIndex !== null) {
          e.preventDefault();
          tabButtons[newIndex].focus();
          activateTab(tabButtons[newIndex]);
        }
      });
    });

    // Profile Filter (PF, PJ, Todos)
    const profileFilter = document.getElementById('profile-filter');
    if (profileFilter) {
      profileFilter.addEventListener('change', () => {
        const val = profileFilter.value;
        document.querySelectorAll('#table-finance-matrix tbody tr[data-profile]').forEach(row => {
          const profile = row.getAttribute('data-profile');
          if (val === 'ALL' || profile === val) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        });
        if (typeof recalculateDRE === 'function') {
          recalculateDRE();
        }
      });
    }

    // Modal New Tenant
    const btnNewTenant = document.getElementById('btn-new-tenant');
    const modalNewTenant = document.getElementById('modal-new-tenant');
    const btnCancelTenant = document.getElementById('btn-cancel-tenant');
    const formNewTenant = document.getElementById('form-new-tenant');

    if (btnNewTenant && modalNewTenant) {
      btnNewTenant.addEventListener('click', () => modalNewTenant.classList.add('open'));
      btnCancelTenant?.addEventListener('click', () => modalNewTenant.classList.remove('open'));

      formNewTenant?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('input-tenant-name').value;
        const plan = document.getElementById('select-tenant-plan').value;

        try {
          const res = await fetch('/api/v1/tenants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, plan })
          });
          if (res.ok) {
            const data = await res.json();
            const select = document.getElementById('tenant-select');
            const opt = document.createElement('option');
            opt.value = data.data.id;
            opt.textContent = data.data.name;
            opt.selected = true;
            select.appendChild(opt);
            modalNewTenant.classList.remove('open');
            formNewTenant.reset();
            // Altera tenant ativo no seletor
            select.dispatchEvent(new Event('change'));
          }
        } catch (err) {
          alert('Erro ao criar tenant: ' + err.message);
        }
      });
    }

    // Recálculo determinístico em tempo real de DRE e KPIs
    function recalculateDRE() {
      const rows = document.querySelectorAll('#table-finance-matrix tbody tr[data-line-id]');
      const profileFilter = document.getElementById('profile-filter')?.value || 'ALL';

      let monthRevenue = 0;
      let monthInvestments = 0;
      let monthFixedExpenses = 0;
      let monthVariableExpenses = 0;
      let totalPatrimony = 0;

      let annualRevenue = 0;
      let annualInvestments = 0;
      let annualFixedExpenses = 0;
      let annualVariableExpenses = 0;

      rows.forEach(row => {
        const profile = row.getAttribute('data-profile');
        if (profileFilter !== 'ALL' && profile !== profileFilter) return;

        const group = row.getAttribute('data-group');
        const monthInputs = row.querySelectorAll('.input-inline-month');

        let rowSum = 0;
        let lastVal = 0;
        monthInputs.forEach(input => {
          const m = Number(input.getAttribute('data-month'));
          const v = parseFloat(input.value) || 0;
          rowSum += v;
          if (v > 0) lastVal = v;

          // Mês de referência (1)
          if (m === 1) {
            if (group === 'RECEITAS') monthRevenue += v;
            else if (group === 'INVESTIMENTOS') monthInvestments += v;
            else if (group === 'DESPESAS_FIXAS') monthFixedExpenses += v;
            else if (group === 'DESPESAS_VARIAVEIS') monthVariableExpenses += v;
          }

          if (group === 'RECEITAS') annualRevenue += v;
          else if (group === 'INVESTIMENTOS') annualInvestments += v;
          else if (group === 'DESPESAS_FIXAS') annualFixedExpenses += v;
          else if (group === 'DESPESAS_VARIAVEIS') annualVariableExpenses += v;
        });

        if (group === 'RECURSOS_FINANCEIROS') {
          totalPatrimony += lastVal;
          const totalEl = row.querySelector('.cell-total-anual strong');
          if (totalEl) totalEl.textContent = 'R$ ' + lastVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        } else {
          const totalEl = row.querySelector('.cell-total-anual strong');
          if (totalEl) totalEl.textContent = 'R$ ' + rowSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        }
      });

      const monthFinalResult = monthRevenue - monthInvestments - monthFixedExpenses - monthVariableExpenses;
      const accumulatedResultYear = annualRevenue - annualInvestments - annualFixedExpenses - annualVariableExpenses;

      // Atualiza KPIs
      const kpiReceived = document.getElementById('kpi-received');
      if (kpiReceived) {
        const valEl = kpiReceived.querySelector('.kpi-value');
        if (valEl) valEl.textContent = 'R$ ' + monthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      }

      const kpiPaid = document.getElementById('kpi-paid');
      if (kpiPaid) {
        const valEl = kpiPaid.querySelector('.kpi-value');
        if (valEl) valEl.textContent = 'R$ ' + (monthFixedExpenses + monthVariableExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      }

      const kpiMonthResult = document.getElementById('kpi-month-result');
      if (kpiMonthResult) {
        const valEl = kpiMonthResult.querySelector('.kpi-value');
        if (valEl) valEl.textContent = 'R$ ' + monthFinalResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      }

      const kpiAccumResult = document.getElementById('kpi-accumulated-result');
      if (kpiAccumResult) {
        const valEl = kpiAccumResult.querySelector('.kpi-value');
        if (valEl) valEl.textContent = 'R$ ' + accumulatedResultYear.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      }

      const kpiPatrimony = document.getElementById('kpi-patrimony-balance');
      if (kpiPatrimony) {
        const valEl = kpiPatrimony.querySelector('.kpi-value');
        if (valEl) valEl.textContent = 'R$ ' + totalPatrimony.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      }
    }

    // Auto-save célula a célula com foco por clique / Tab / Enter
    function attachCellListeners(row) {
      const tenantId = document.getElementById('tenant-select')?.value;
      const lineId = row.getAttribute('data-line-id');

      // Month inputs
      const monthInputs = row.querySelectorAll('.input-inline-month');
      monthInputs.forEach((input, idx) => {
        const saveCell = async () => {
          const m = Number(input.getAttribute('data-month'));
          const rawVal = input.value;
          const val = rawVal !== '' ? parseFloat(rawVal) : 0;
          const currentLineId = row.getAttribute('data-line-id') || input.getAttribute('data-line-id');
          if (!currentLineId) return;

          recalculateDRE();

          try {
            await fetch('/api/v1/finance/cell', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tenantId,
                lineId: currentLineId,
                month: m,
                realized: val,
              })
            });
          } catch (e) {
            console.error('Erro no auto-save da célula:', e);
          }
        };

        input.addEventListener('blur', saveCell);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            saveCell();
            // Foca a célula da mesma coluna na linha seguinte se existir, ou o próximo input
            const nextRow = row.nextElementSibling;
            if (nextRow && nextRow.hasAttribute('data-line-id')) {
              const nextInput = nextRow.querySelectorAll('.input-inline-month')[idx];
              if (nextInput) nextInput.focus();
            } else if (idx < monthInputs.length - 1) {
              monthInputs[idx + 1].focus();
            }
          }
        });
      });

      // Name input
      const nameInput = row.querySelector('.input-inline-name');
      if (nameInput) {
        const saveName = async () => {
          const currentLineId = row.getAttribute('data-line-id');
          const val = nameInput.value.trim();
          if (!currentLineId || !val) return;
          try {
            await fetch('/api/v1/finance/line', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tenantId, lineId: currentLineId, name: val })
            });
          } catch (e) {
            console.error('Erro no auto-save do nome:', e);
          }
        };
        nameInput.addEventListener('blur', saveName);
        nameInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            saveName();
            const profileSelect = row.querySelector('.select-inline-profile');
            if (profileSelect) profileSelect.focus();
          }
        });
      }

      // Profile select
      const profileSelect = row.querySelector('.select-inline-profile');
      if (profileSelect) {
        profileSelect.addEventListener('change', async () => {
          const currentLineId = row.getAttribute('data-line-id');
          const val = profileSelect.value;
          row.setAttribute('data-profile', val);
          recalculateDRE();
          if (!currentLineId) return;
          try {
            await fetch('/api/v1/finance/line', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tenantId, lineId: currentLineId, profile: val })
            });
          } catch (e) {
            console.error('Erro no auto-save do perfil:', e);
          }
        });
      }

      // Delete button
      const delBtn = row.querySelector('.btn-delete-line');
      if (delBtn) {
        delBtn.addEventListener('click', async () => {
          const currentLineId = row.getAttribute('data-line-id');
          const name = row.querySelector('.input-inline-name')?.value || 'esta linha';
          if (confirm('Deseja realmente excluir "' + name + '"?')) {
            row.remove();
            recalculateDRE();
            if (currentLineId) {
              try {
                await fetch('/api/v1/finance/line', {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tenantId, lineId: currentLineId })
                });
              } catch (e) {
                console.error('Erro ao excluir linha:', e);
              }
            }
          }
        });
      }
    }

    // Atacha listeners a todas as linhas existentes
    document.querySelectorAll('#table-finance-matrix tbody tr[data-line-id]').forEach(attachCellListeners);

    // Inserção inline de nova linha (+ Nova Linha)
    document.querySelectorAll('.btn-add-inline-line, .btn-add-finance-line').forEach(btn => {
      btn.addEventListener('click', async () => {
        const grp = btn.getAttribute('data-group') || 'RECURSOS_FINANCEIROS';
        const tenantId = document.getElementById('tenant-select')?.value;

        // Cria a linha na API primeiro para obter o ID
        let createdLine = null;
        try {
          const res = await fetch('/api/v1/finance/line/inline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenantId,
              group: grp,
              name: '',
              profile: 'PF',
            })
          });
          if (res.ok) {
            const data = await res.json();
            createdLine = data.data;
          }
        } catch (e) {
          console.error('Erro ao criar linha inline:', e);
        }

        const lineId = createdLine ? createdLine.id : 'temp-' + Date.now();
        const tr = document.createElement('tr');
        tr.setAttribute('data-line-id', lineId);
        tr.setAttribute('data-profile', 'PF');
        tr.setAttribute('data-group', grp);

        let monthsHtml = '';
        for (let m = 1; m <= 12; m++) {
          monthsHtml += '<td class="cell-month" data-month="' + m + '">' +
            '<input type="number" step="0.01" class="cell-inline-input input-inline-month" data-line-id="' + lineId + '" data-month="' + m + '" data-group="' + grp + '" placeholder="0,00" aria-label="Mês ' + m + '">' +
            '</td>';
        }

        tr.innerHTML = '<td class="cell-name">' +
          '<input type="text" class="cell-inline-input input-inline-name" placeholder="Nome da conta..." data-line-id="' + lineId + '" aria-label="Nome da Conta">' +
          '</td>' +
          '<td class="cell-profile">' +
          '<select class="select-inline-profile" data-line-id="' + lineId + '" aria-label="Perfil">' +
          '<option value="PF" selected>PF</option>' +
          '<option value="PJ">PJ</option>' +
          '</select>' +
          '</td>' +
          monthsHtml +
          '<td class="cell-total-anual" id="total-anual-' + lineId + '"><strong>R$ 0,00</strong></td>' +
          '<td class="cell-actions" style="white-space: nowrap;">' +
          '<button type="button" class="btn-danger btn-delete-resource btn-delete-line" data-line-id="' + lineId + '" title="Excluir Linha">Excluir</button>' +
          '</td>';

        // Localiza a posição correta para inserção: após a última linha do grupo
        const headerRow = document.querySelector('.finance-group-header[data-header-group="' + grp + '"]');
        let insertTarget = headerRow;
        if (headerRow) {
          let next = headerRow.nextElementSibling;
          while (next && next.getAttribute('data-group') === grp) {
            insertTarget = next;
            next = next.nextElementSibling;
          }
          if (insertTarget.nextElementSibling) {
            insertTarget.parentNode.insertBefore(tr, insertTarget.nextElementSibling);
          } else {
            insertTarget.parentNode.appendChild(tr);
          }
        } else {
          document.querySelector('#table-finance-matrix tbody')?.appendChild(tr);
        }

        attachCellListeners(tr);
        recalculateDRE();

        // Foco imediato no campo do Nome da Conta
        const nameInput = tr.querySelector('.input-inline-name');
        if (nameInput) {
          nameInput.focus();
        }
      });
    });

    // Tenant, Ano, Mês changes
    const tenantSelect = document.getElementById('tenant-select');
    const yearSelect = document.getElementById('year-select');
    const monthSelect = document.getElementById('month-select');

    function refreshDashboard() {
      const tId = tenantSelect.value;
      const yr = yearSelect.value;
      const mo = monthSelect.value;
      window.location.search = '?tenantId=' + tId + '&year=' + yr + '&month=' + mo;
    }

    tenantSelect?.addEventListener('change', refreshDashboard);
    yearSelect?.addEventListener('change', refreshDashboard);
    monthSelect?.addEventListener('change', refreshDashboard);
  </script>
</body>
</html>`;
}

/**
 * Cria e inicia o servidor HTTP
 */
export async function startDashboardServer(port = 3000, existingStore = null) {
  const store = existingStore || new SaaSStore();
  const demoTenant = seedDemoData(store);
  const routeHandlers = createApiRouteHandlers(store);

  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      const pathname = parsedUrl.pathname;
      const method = req.method.toUpperCase();

      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Paperclip-Run-Id');

      if (method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // Helper para ler JSON body
      const readBody = () => new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch (e) {
            reject(new Error('Corpo de requisição JSON inválido.'));
          }
        });
        req.on('error', reject);
      });

      // API Endpoints (/api/v1/...)
      if (pathname.startsWith('/api/v1/')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        if (pathname === '/api/v1/tenants' && method === 'GET') {
          const result = await routeHandlers.handleGetTenants();
          res.writeHead(result.status);
          res.end(JSON.stringify(result));
          return;
        }

        if (pathname === '/api/v1/tenants' && method === 'POST') {
          const body = await readBody();
          const result = await routeHandlers.handlePostTenant(body);
          res.writeHead(result.status);
          res.end(JSON.stringify(result));
          return;
        }

        if (pathname === '/api/v1/dashboard' && method === 'GET') {
          const query = Object.fromEntries(parsedUrl.searchParams.entries());
          const result = await routeHandlers.handleGetDashboard(query);
          res.writeHead(result.status);
          res.end(JSON.stringify(result));
          return;
        }

        if (pathname === '/api/v1/finance/cell' && (method === 'PATCH' || method === 'PUT' || method === 'POST')) {
          const body = await readBody();
          const result = await routeHandlers.handlePatchFinanceCell(body);
          res.writeHead(result.status);
          res.end(JSON.stringify(result));
          return;
        }

        if (pathname === '/api/v1/finance/entry' && (method === 'PUT' || method === 'POST' || method === 'PATCH')) {
          const body = await readBody();
          const result = await routeHandlers.handlePutFinanceEntry(body);
          res.writeHead(result.status);
          res.end(JSON.stringify(result));
          return;
        }

        if (pathname === '/api/v1/finance/line/inline' && method === 'POST') {
          const body = await readBody();
          const result = await routeHandlers.handlePostInlineFinanceLine(body);
          res.writeHead(result.status);
          res.end(JSON.stringify(result));
          return;
        }

        if (pathname === '/api/v1/finance/line') {
          if (method === 'POST') {
            const body = await readBody();
            const result = await routeHandlers.handlePostFinanceLine(body);
            res.writeHead(result.status);
            res.end(JSON.stringify(result));
            return;
          }
          if (method === 'PUT' || method === 'PATCH') {
            const body = await readBody();
            const result = await routeHandlers.handlePutFinanceLine(body);
            res.writeHead(result.status);
            res.end(JSON.stringify(result));
            return;
          }
          if (method === 'DELETE') {
            let body = {};
            try { body = await readBody(); } catch { body = {}; }
            const query = Object.fromEntries(parsedUrl.searchParams.entries());
            const payload = {
              tenantId: body.tenantId || query.tenantId,
              lineId: body.lineId || query.lineId,
            };
            const result = await routeHandlers.handleDeleteFinanceLine(payload);
            res.writeHead(result.status);
            res.end(JSON.stringify(result));
            return;
          }
        }

        if (pathname === '/api/v1/cards/purchase' && method === 'POST') {
          const body = await readBody();
          const result = await routeHandlers.handlePostCardPurchase(body);
          res.writeHead(result.status);
          res.end(JSON.stringify(result));
          return;
        }

        if (pathname === '/api/v1/cards/invoice' && (method === 'PUT' || method === 'POST')) {
          const body = await readBody();
          const result = await routeHandlers.handlePutCardInvoice(body);
          res.writeHead(result.status);
          res.end(JSON.stringify(result));
          return;
        }

        if (pathname === '/api/v1/goals' && method === 'GET') {
          const query = Object.fromEntries(parsedUrl.searchParams.entries());
          const result = await routeHandlers.handleGetGoals(query);
          res.writeHead(result.status);
          res.end(JSON.stringify(result));
          return;
        }

        if (pathname === '/api/v1/goals' && method === 'POST') {
          const body = await readBody();
          const result = await routeHandlers.handlePostGoal(body);
          res.writeHead(result.status);
          res.end(JSON.stringify(result));
          return;
        }

        if (pathname === '/api/v1/action-plan/indicator' && (method === 'PUT' || method === 'POST')) {
          const body = await readBody();
          const result = await routeHandlers.handlePutActionPlanIndicator(body);
          res.writeHead(result.status);
          res.end(JSON.stringify(result));
          return;
        }

        res.writeHead(404);
        res.end(JSON.stringify({ status: 404, error: 'Endpoint API não encontrado.' }));
        return;
      }

      // Web Dashboard (HTML)
      if (pathname === '/' || pathname === '/index.html' || pathname === '/dashboard') {
        const tenantId = parsedUrl.searchParams.get('tenantId') || demoTenant.id;
        const year = Number(parsedUrl.searchParams.get('year') || '2026');
        const month = Number(parsedUrl.searchParams.get('month') || '1');
        const referenceDate = parsedUrl.searchParams.get('referenceDate') || '2026-01-15';

        const dashboardData = store.getDashboard(tenantId, year, month, referenceDate);
        const tenants = store.listTenants();

        const html = renderDashboardHtml({
          ...dashboardData,
          tenants,
        });

        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        });
        res.end(html);
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Página não encontrada');
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });

  const host = process.env.HOST || '0.0.0.0';
  return new Promise((resolve) => {
    server.listen(port, host, () => {
      resolve(server);
    });
  });
}

// Execução direta (npm run dev)
if (process.argv[1] && process.argv[1].endsWith('standalone-server.mjs')) {
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
  startDashboardServer(PORT).then(server => {
    const p = server.address().port;
    console.log(`\n🚀 Avance SaaS Multi-Tenant Server rodando em http://127.0.0.1:${p}\n`);
  });
}
