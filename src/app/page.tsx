'use client';

import React, { useState } from 'react';
import {
  LiquidLensCard,
  LiquidLensDock,
  LiquidLensModal,
  LiquidLensBadge,
} from '../components/liquid-lens/index.ts';

/**
 * Página principal do SaaS Multi-Tenant no Next.js App Router (ADR-0002 / AV-98)
 * Renderiza interface dos 4 módulos com componentes Liquid Lens / Liquid Glass UI.
 */
export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<string>('tab-finance');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [tenantName, setTenantName] = useState<string>('Avance Matriz');
  const [tenantPlan, setTenantPlan] = useState<string>('PRO');

  const dockTabs = [
    { id: 'tab-finance', label: '1. Controle Finanças', targetPanelId: 'panel-finance' },
    { id: 'tab-cards', label: '2. Cartões de Crédito', targetPanelId: 'panel-cards' },
    { id: 'tab-goals', label: '3. Propósitos e Metas', targetPanelId: 'panel-goals' },
    { id: 'tab-action-plan', label: '4. Plano de Ação', targetPanelId: 'panel-action-plan' },
  ];

  const handleCreateTenant = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const plan = formData.get('plan') as string;
    if (name) {
      setTenantName(name);
      setTenantPlan(plan || 'PRO');
      setIsModalOpen(false);
    }
  };

  return (
    <main className="app-wrapper">
      {/* Header Liquid Lens */}
      <header className="saas-header" role="banner">
        <div className="header-brand">
          <h1 className="brand-title">Avance SaaS</h1>
          <LiquidLensBadge id="plan-badge">{tenantPlan}</LiquidLensBadge>
          <button
            id="btn-new-tenant"
            type="button"
            className="btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            + Novo Tenant
          </button>
        </div>

        <div className="header-controls">
          <div className="control-group">
            <label htmlFor="tenant-select">Tenant:</label>
            <select id="tenant-select" value={tenantName} onChange={(e) => setTenantName(e.target.value)}>
              <option value={tenantName}>{tenantName}</option>
            </select>
          </div>
          <div className="control-group">
            <label htmlFor="profile-filter">Visão:</label>
            <select id="profile-filter">
              <option value="ALL">Todos (PF + PJ)</option>
              <option value="PF">Pessoa Física (PF)</option>
              <option value="PJ">Pessoa Jurídica (PJ)</option>
            </select>
          </div>
        </div>
      </header>

      {/* Dock de Abas com Efeito Líquido */}
      <LiquidLensDock
        items={dockTabs}
        activeId={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId)}
      />

      {/* Módulo 1: Controle Finanças */}
      {activeTab === 'tab-finance' && (
        <section id="panel-finance" className="tab-panel" style={{ display: 'block' }}>
          <div className="kpi-grid">
            <LiquidLensCard id="kpi-received" title="Recebido no Mês" value="R$ 12.000,00" variant="success" />
            <LiquidLensCard id="kpi-to-receive" title="A Receber no Mês" value="R$ 0,00" />
            <LiquidLensCard id="kpi-paid" title="Pago no Mês" value="R$ 1.200,00" />
            <LiquidLensCard id="kpi-to-pay" title="A Pagar no Mês" value="R$ 3.500,00" />
            <LiquidLensCard id="kpi-overdue-count" title="Contas Atrasadas" value="1 conta" variant="danger" />
            <LiquidLensCard id="kpi-overdue-amount" title="Valor em Atraso" value="R$ 450,00" variant="danger" />
            <LiquidLensCard id="kpi-month-result" title="Resultado Final do Mês" value="R$ 10.800,00" variant="success" />
            <LiquidLensCard id="kpi-accumulated-result" title="Resultado Acumulado Ano" value="R$ 10.800,00" variant="success" />
            <LiquidLensCard id="kpi-patrimony-balance" title="Patrimônio (Último Saldo)" value="R$ 107.500,00" />
          </div>

          <div className="section-card liquid-lens">
            <div className="section-header">
              <h2 className="section-title">Evolução Mensal e Indicadores Resumo</h2>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <LiquidLensCard id="indicator-investment-rate" title="Taxa de Investimento" value="35%" />
              <LiquidLensCard id="indicator-cards-ratio" title="Cartões ÷ Rendimento" value="28%" />
              <LiquidLensCard id="indicator-paid-percentage" title="% Contas Pagas" value="92%" />
            </div>
          </div>
        </section>
      )}

      {/* Módulo 2: Cartões de Crédito */}
      {activeTab === 'tab-cards' && (
        <section id="panel-cards" className="tab-panel" style={{ display: 'block' }}>
          <div className="cards-list">
            <LiquidLensCard title="Banco do Brasil Ourocard">
              <p>Limite: R$ 15.000,00 | Fatura: R$ 3.420,00</p>
            </LiquidLensCard>
            <LiquidLensCard title="Nubank PF Mastercard Platinum">
              <p>Limite: R$ 12.000,00 | Fatura: R$ 2.150,00</p>
            </LiquidLensCard>
          </div>
        </section>
      )}

      {/* Módulo 3: Metas */}
      {activeTab === 'tab-goals' && (
        <section id="panel-goals" className="tab-panel" style={{ display: 'block' }}>
          <div className="kpi-grid">
            <LiquidLensCard title="Metas Financeiras" value="3 ativas" variant="success" />
            <LiquidLensCard title="Desenvolvimento Pessoal" value="2 ativas" />
            <LiquidLensCard title="Física / Saúde" value="1 ativa" />
            <LiquidLensCard title="Diversão / Lazer" value="1 ativa" />
          </div>
        </section>
      )}

      {/* Módulo 4: Plano de Ação */}
      {activeTab === 'tab-action-plan' && (
        <section id="panel-action-plan" className="tab-panel" style={{ display: 'block' }}>
          <div className="kpi-grid">
            <LiquidLensCard title="Indicadores SOMA" value="4 acompanhados" />
            <LiquidLensCard title="Indicadores LIMITE_MAXIMO" value="2 acompanhados" />
            <LiquidLensCard title="Indicadores ULTIMO_VALOR" value="2 acompanhados" />
            <LiquidLensCard title="Marcos TEXTO" value="3 concluídos" variant="success" />
          </div>
        </section>
      )}

      {/* Modal Liquid Lens */}
      <LiquidLensModal
        id="modal-new-tenant"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Cadastrar Novo Tenant"
      >
        <form onSubmit={handleCreateTenant}>
          <div className="form-group">
            <label htmlFor="input-tenant-name">Nome da Empresa / Tenant:</label>
            <input type="text" id="input-tenant-name" name="name" required placeholder="Ex: Acme Corp" />
          </div>
          <div className="form-group">
            <label htmlFor="select-tenant-plan">Plano de Assinatura:</label>
            <select id="select-tenant-plan" name="plan">
              <option value="PRO">PRO</option>
              <option value="FREE">FREE</option>
              <option value="ENTERPRISE">ENTERPRISE</option>
            </select>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Salvar Tenant
            </button>
          </div>
        </form>
      </LiquidLensModal>
    </main>
  );
}
