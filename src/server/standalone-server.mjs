/**
 * Servidor Standalone e Renderizador do Dashboard Web Multi-Tenant Avance (AC-16 / ADR-0002)
 * Fornece API REST/JSON (/api/v1/...) e aplicação web com os 4 módulos integrados.
 */

import http from 'node:http';
import { URL } from 'node:url';
import { SaaSStore } from './saas-store.ts';
import { createApiRouteHandlers } from '../app/api/v1/route-handlers.ts';
import { LIQUID_LENS_CLASSES, LIQUID_LENS_TOKENS } from '../components/liquid-lens/tokens.ts';

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
      --surface: rgba(255, 255, 255, 0.78);
      --surface-subtle: rgba(241, 245, 249, 0.7);
      --text: #0f172a;
      --text-muted: #475569;
      --text-light: #64748b;
      --border: rgba(203, 213, 225, 0.7);
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --success-bg: #dcfce7;
      --success-text: #166534;
      --warning-bg: #fef3c7;
      --warning-text: #92400e;
      --danger-bg: #fee2e2;
      --danger-text: #991b1b;
      --focus-ring: #2563eb;
      --font: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

      /* Liquid Lens Refraction Tokens */
      --lens-blur: 16px;
      --lens-saturate: 180%;
      --lens-contrast: 102%;
      --lens-rim: 1px solid rgba(255, 255, 255, 0.65);
      --lens-specular: inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.85);
      --lens-shadow: 0 12px 32px -10px rgba(15, 23, 42, 0.12), 0 4px 12px -2px rgba(15, 23, 42, 0.05);
      --dock-blur: 20px;
      --dock-bg: rgba(255, 255, 255, 0.84);
      --dock-border: 1px solid rgba(255, 255, 255, 0.7);
      --dock-active-bg: rgba(37, 99, 235, 0.12);
      --dock-active-shadow: 0 4px 14px -2px rgba(37, 99, 235, 0.22), inset 0 1px 1px 0 rgba(255, 255, 255, 0.9);
      --modal-backdrop-blur: 14px;
      --modal-backdrop-bg: rgba(15, 23, 42, 0.5);
      --modal-dialog-bg: rgba(255, 255, 255, 0.95);
      --modal-dialog-shadow: 0 25px 60px -15px rgba(15, 23, 42, 0.35), inset 0 1px 2px 0 rgba(255, 255, 255, 0.85);
    }
    body {
      font-family: var(--font);
      background: radial-gradient(circle at 10% 20%, rgba(219, 234, 254, 0.55) 0%, rgba(248, 250, 252, 1) 45%),
                  radial-gradient(circle at 90% 80%, rgba(224, 231, 255, 0.45) 0%, rgba(248, 250, 252, 0.85) 50%);
      background-attachment: fixed;
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
      background: var(--surface);
      backdrop-filter: blur(var(--lens-blur)) saturate(var(--lens-saturate));
      -webkit-backdrop-filter: blur(var(--lens-blur)) saturate(var(--lens-saturate));
      border: var(--lens-rim);
      border-radius: 12px;
      padding: 1rem 1.25rem;
      margin-bottom: 1.25rem;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      box-shadow: var(--lens-shadow), var(--lens-specular);
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

    /* Liquid Lens Dock & Tab Navigation */
    nav.tab-nav,
    .liquid-lens-dock {
      display: inline-flex;
      gap: 0.4rem;
      margin-bottom: 1.25rem;
      padding: 0.35rem 0.5rem;
      background: var(--dock-bg);
      backdrop-filter: blur(var(--dock-blur)) saturate(180%);
      -webkit-backdrop-filter: blur(var(--dock-blur)) saturate(180%);
      border: var(--dock-border);
      border-radius: 9999px;
      box-shadow: 0 8px 24px -8px rgba(15, 23, 42, 0.12),
                  inset 0 1px 1px 0 rgba(255, 255, 255, 0.85);
      overflow-x: auto;
      max-width: 100%;
      -webkit-overflow-scrolling: touch;
    }
    .tab-btn,
    .liquid-lens-dock-tab {
      padding: 0.55rem 1.15rem;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 9999px;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }
    .tab-btn:hover,
    .liquid-lens-dock-tab:hover {
      background: rgba(255, 255, 255, 0.65);
      color: var(--text);
    }
    .tab-btn[aria-selected="true"],
    .liquid-lens-dock-tab-active {
      background: var(--dock-active-bg);
      color: var(--primary);
      border-color: rgba(37, 99, 235, 0.35);
      box-shadow: var(--dock-active-shadow);
    }
    /* Tab Panels */
    .tab-panel {
      display: none;
    }
    .tab-panel[aria-hidden="false"] {
      display: block;
    }
    /* Liquid Lens KPI Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .kpi-card,
    .liquid-lens-card {
      position: relative;
      background: var(--surface);
      backdrop-filter: blur(var(--lens-blur)) saturate(var(--lens-saturate));
      -webkit-backdrop-filter: blur(var(--lens-blur)) saturate(var(--lens-saturate));
      border: var(--lens-rim);
      border-radius: 12px;
      padding: 1.1rem;
      box-shadow: var(--lens-shadow), var(--lens-specular);
      overflow: hidden;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                  box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                  border-color 0.2s ease;
    }
    .kpi-card:hover,
    .liquid-lens-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 16px 36px -10px rgba(15, 23, 42, 0.16),
                  0 6px 16px -2px rgba(15, 23, 42, 0.08),
                  inset 0 1px 2px 0 rgba(255, 255, 255, 0.95);
      border-color: rgba(255, 255, 255, 0.85);
    }
    .kpi-card::before,
    .liquid-lens-card::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 38%;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 100%);
      pointer-events: none;
      border-radius: inherit;
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
      background: var(--surface);
      backdrop-filter: blur(var(--lens-blur)) saturate(var(--lens-saturate));
      -webkit-backdrop-filter: blur(var(--lens-blur)) saturate(var(--lens-saturate));
      border: var(--lens-rim);
      border-radius: 12px;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
      box-shadow: var(--lens-shadow), var(--lens-specular);
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
    /* Modals & Liquid Lens Backdrop */
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
      background: var(--modal-dialog-bg);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.75);
      border-radius: 16px;
      padding: 1.75rem;
      width: 100%;
      max-width: 480px;
      box-shadow: var(--modal-dialog-shadow);
      overflow: hidden;
    }
    .modal-content::before,
    .liquid-lens-modal::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 50px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 100%);
      pointer-events: none;
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
<body class="liquid-lens-theme">
  <div class="app-wrapper">
    <!-- Header / Administração SaaS Multi-Tenant -->
    <header class="saas-header" role="banner">
      <div class="header-brand">
        <h1 class="brand-title">Avance SaaS</h1>
        <span id="plan-badge" class="badge badge-plan">${tenant.plan}</span>
        <span id="ds-badge" class="badge" style="background: rgba(37, 99, 235, 0.12); color: #2563eb; border: 1px solid rgba(37, 99, 235, 0.35); font-size: 0.75rem; font-weight: 600;">Liquid Lens DS</span>
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
                <th scope="col">Linha / Categoria</th>
                <th scope="col">Perfil</th>
                <th scope="col">Status Mês</th>
                <th scope="col">Meta Mês</th>
                <th scope="col">Realizado Mês</th>
                <th scope="col">Previsto Mês</th>
                <th scope="col">Total Anual</th>
                <th scope="col">Média</th>
                <th scope="col">Ação</th>
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

                return `
                  <tr class="finance-group-header">
                    <td colspan="9"><strong>${groupLabel}</strong> (${groupLines.length} itens)</td>
                  </tr>
                  ${groupLines.map((l) => {
                    const statusClass = l.referenceMonthStatus.includes('✔') ? 'status-ok' : l.referenceMonthStatus.includes('⚠') ? 'status-overdue' : l.referenceMonthStatus.includes('⏳') ? 'status-pending' : 'status-empty';
                    return `
                      <tr data-line-id="${l.id}" data-profile="${l.profile}">
                        <td>${l.name}</td>
                        <td><span class="badge ${l.profile === 'PF' ? 'badge-plan' : 'status-pending'}">${l.profile}</span></td>
                        <td><span class="badge-status ${statusClass}">${l.referenceMonthStatus}</span></td>
                        <td><span class="badge-status ${l.referenceMonthGoalStatus === 'bateu meta' ? 'status-ok' : l.referenceMonthGoalStatus === 'não bateu meta' ? 'status-overdue' : 'status-empty'}">${l.referenceMonthGoalStatus}</span></td>
                        <td>R$ ${l.referenceMonthValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td>R$ ${(l.months[referenceMonth]?.target || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td><strong>R$ ${l.totalRealized.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></td>
                        <td>R$ ${l.monthlyAverage.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td>
                          <button class="btn-secondary btn-edit-entry" data-line-id="${l.id}" data-line-name="${l.name}">Editar</button>
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

    <!-- Modal Editar Lançamento Financeiro / Liquid Lens Modal -->
    <div id="modal-edit-finance" class="modal liquid-lens-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-finance-title">
      <div class="modal-content liquid-lens-modal">
        <h3 id="modal-finance-title" class="modal-title">Editar Lançamento Mensal</h3>
        <form id="form-edit-finance-entry">
          <input type="hidden" id="edit-line-id" name="lineId">
          <div class="form-group">
            <label for="edit-line-name-display">Linha:</label>
            <input type="text" id="edit-line-name-display" disabled>
          </div>
          <div class="form-group">
            <label for="edit-month">Mês:</label>
            <select id="edit-month" name="month">
              ${['1 - Jan', '2 - Fev', '3 - Mar', '4 - Abr', '5 - Mai', '6 - Jun', '7 - Jul', '8 - Ago', '9 - Set', '10 - Out', '11 - Nov', '12 - Dez']
                .map((m, i) => `<option value="${i + 1}">${m}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="edit-realized">Valor Realizado (R$):</label>
            <input type="number" id="edit-realized" name="realized" step="0.01" min="0">
          </div>
          <div class="form-group">
            <label for="edit-target">Meta / Previsto (R$):</label>
            <input type="number" id="edit-target" name="target" step="0.01" min="0">
          </div>
          <div class="form-group">
            <label for="edit-settled-at">Data de Liquidação (Pago/Recebido em):</label>
            <input type="date" id="edit-settled-at" name="settledAt">
          </div>
          <div class="form-actions">
            <button type="button" id="btn-cancel-edit-finance" class="btn-secondary">Cancelar</button>
            <button type="submit" id="btn-submit-edit-finance" class="btn-primary">Salvar</button>
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

    // Modal Edit Finance Entry
    const modalEditFinance = document.getElementById('modal-edit-finance');
    const btnCancelEditFinance = document.getElementById('btn-cancel-edit-finance');
    const formEditFinance = document.getElementById('form-edit-finance-entry');

    document.querySelectorAll('.btn-edit-entry').forEach(btn => {
      btn.addEventListener('click', () => {
        const lineId = btn.getAttribute('data-line-id');
        const lineName = btn.getAttribute('data-line-name');
        document.getElementById('edit-line-id').value = lineId;
        document.getElementById('edit-line-name-display').value = lineName;
        modalEditFinance.classList.add('open');
      });
    });

    btnCancelEditFinance?.addEventListener('click', () => {
      modalEditFinance.classList.remove('open');
    });

    formEditFinance?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tenantId = document.getElementById('tenant-select').value;
      const lineId = document.getElementById('edit-line-id').value;
      const month = Number(document.getElementById('edit-month').value);
      const realized = Number(document.getElementById('edit-realized').value);
      const target = Number(document.getElementById('edit-target').value);
      const settledAt = document.getElementById('edit-settled-at').value || null;

      try {
        const res = await fetch('/api/v1/finance/entry', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, lineId, month, realized, target, settledAt })
        });
        if (res.ok) {
          modalEditFinance.classList.remove('open');
          window.location.reload();
        }
      } catch (err) {
        alert('Erro ao atualizar lançamento: ' + err.message);
      }
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

        if (pathname === '/api/v1/finance/entry' && (method === 'PUT' || method === 'POST')) {
          const body = await readBody();
          const result = await routeHandlers.handlePutFinanceEntry(body);
          res.writeHead(result.status);
          res.end(JSON.stringify(result));
          return;
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
