'use client';

import React, { useState } from 'react';
import {
  LiquidLensCard,
  LiquidLensDock,
  LiquidLensModal,
  LiquidLensBadge,
} from '../components/liquid-lens/index.ts';

interface ResourceAccount {
  id: string;
  name: string;
  profile: 'PF' | 'PJ';
  months: Record<number, { realized: number; target: number }>;
}

/**
 * Página principal do SaaS Multi-Tenant no Next.js App Router (ADR-0002 / AV-98 / AV-100)
 * Renderiza interface dos 4 módulos com componentes Liquid Lens / Liquid Glass UI
 * e gestão completa de recursos financeiros.
 */
export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<string>('tab-finance');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState<boolean>(false);
  const [isEditResourceModalOpen, setIsEditResourceModalOpen] = useState<boolean>(false);
  const [tenantName, setTenantName] = useState<string>('Avance Matriz');
  const [tenantPlan, setTenantPlan] = useState<string>('PRO');
  const [editingResource, setEditingResource] = useState<ResourceAccount | null>(null);

  const [resources, setResources] = useState<ResourceAccount[]>([
    {
      id: 'res-1',
      name: 'Banco do Brasil Corrente',
      profile: 'PF',
      months: { 1: { realized: 25000, target: 20000 }, 2: { realized: 27500, target: 25000 } },
    },
    {
      id: 'res-2',
      name: 'Nubank PF CDB/Caixinha',
      profile: 'PF',
      months: { 1: { realized: 80000, target: 75000 } },
    },
    {
      id: 'res-3',
      name: 'Nubank PJ Corrente',
      profile: 'PJ',
      months: { 1: { realized: 15000, target: 12000 } },
    },
  ]);

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

  const handleAddResource = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const profile = (formData.get('profile') as 'PF' | 'PJ') || 'PF';

    if (name) {
      const newRes: ResourceAccount = {
        id: `res-${Date.now()}`,
        name,
        profile,
        months: {},
      };
      setResources((prev) => [...prev, newRes]);
      setIsResourceModalOpen(false);
    }
  };

  const handleOpenEditResource = (res: ResourceAccount) => {
    setEditingResource(res);
    setIsEditResourceModalOpen(true);
  };

  const handleSaveEditResource = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingResource) return;

    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string) || editingResource.name;
    const profile = (formData.get('profile') as 'PF' | 'PJ') || editingResource.profile;

    const updatedMonths: Record<number, { realized: number; target: number }> = {};
    for (let m = 1; m <= 12; m++) {
      const realizedVal = formData.get(`realized-${m}`);
      const targetVal = formData.get(`target-${m}`);
      updatedMonths[m] = {
        realized: realizedVal ? Number(realizedVal) : 0,
        target: targetVal ? Number(targetVal) : 0,
      };
    }

    setResources((prev) =>
      prev.map((r) =>
        r.id === editingResource.id
          ? { ...r, name, profile, months: updatedMonths }
          : r
      )
    );
    setIsEditResourceModalOpen(false);
    setEditingResource(null);
  };

  const handleDeleteResource = (id: string, name: string) => {
    if (confirm(`Deseja realmente excluir a conta "${name}"?`)) {
      setResources((prev) => prev.filter((r) => r.id !== id));
    }
  };

  // Calcula último saldo informado para cada recurso
  const getLastBalance = (res: ResourceAccount): number => {
    for (let m = 12; m >= 1; m--) {
      const val = res.months[m]?.realized ?? 0;
      if (val > 0) return val;
    }
    return 0;
  };

  const totalPatrimony = resources.reduce((acc, r) => acc + getLastBalance(r), 0);

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
            <LiquidLensCard
              id="kpi-patrimony-balance"
              title="Patrimônio (Último Saldo)"
              value={`R$ ${totalPatrimony.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            />
          </div>

          {/* Gestão de Recursos Financeiros (AV-100) */}
          <div className="section-card liquid-lens" style={{ marginBottom: '1.25rem' }}>
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className="section-title">Recursos Financeiros & Saldos (Último Saldo Informado)</h2>
              <button
                type="button"
                id="btn-new-resource"
                className="btn-primary"
                onClick={() => setIsResourceModalOpen(true)}
              >
                + Nova Conta / Recurso
              </button>
            </div>

            <div className="table-responsive">
              <table className="data-table" aria-label="Recursos Financeiros">
                <thead>
                  <tr>
                    <th scope="col">Conta / Recurso</th>
                    <th scope="col">Perfil</th>
                    <th scope="col">Último Saldo Informado</th>
                    <th scope="col">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map((r) => {
                    const balance = getLastBalance(r);
                    return (
                      <tr key={r.id}>
                        <td><strong>{r.name}</strong></td>
                        <td>
                          <span className={`badge ${r.profile === 'PF' ? 'badge-plan' : 'status-pending'}`}>
                            {r.profile}
                          </span>
                        </td>
                        <td>
                          <strong>R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => handleOpenEditResource(r)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="btn-danger"
                              onClick={() => handleDeleteResource(r.id, r.name)}
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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

      {/* Modal Novo Tenant */}
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

      {/* Modal Nova Conta / Recurso Financeiro */}
      <LiquidLensModal
        id="modal-new-resource"
        isOpen={isResourceModalOpen}
        onClose={() => setIsResourceModalOpen(false)}
        title="Nova Conta / Recurso Financeiro"
      >
        <form onSubmit={handleAddResource}>
          <div className="form-group">
            <label htmlFor="input-new-resource-name">Nome da Conta / Recurso:</label>
            <input
              type="text"
              id="input-new-resource-name"
              name="name"
              required
              placeholder="Ex: CDB Liquidez Diária, Banco Inter, etc."
            />
          </div>
          <div className="form-group">
            <label htmlFor="select-new-resource-profile">Perfil:</label>
            <select id="select-new-resource-profile" name="profile">
              <option value="PF">Pessoa Física (PF)</option>
              <option value="PJ">Pessoa Jurídica (PJ)</option>
            </select>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsResourceModalOpen(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Criar Recurso
            </button>
          </div>
        </form>
      </LiquidLensModal>

      {/* Modal Editar Recurso & Saldos */}
      {editingResource && (
        <LiquidLensModal
          id="modal-edit-resource"
          isOpen={isEditResourceModalOpen}
          onClose={() => {
            setIsEditResourceModalOpen(false);
            setEditingResource(null);
          }}
          title="Editar Recurso Financeiro & Saldos"
        >
          <form onSubmit={handleSaveEditResource}>
            <div className="form-group">
              <label htmlFor="edit-modal-name">Nome da Conta:</label>
              <input
                type="text"
                id="edit-modal-name"
                name="name"
                defaultValue={editingResource.name}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit-modal-profile">Perfil:</label>
              <select
                id="edit-modal-profile"
                name="profile"
                defaultValue={editingResource.profile}
              >
                <option value="PF">Pessoa Física (PF)</option>
                <option value="PJ">Pessoa Jurídica (PJ)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '0.75rem' }}>
              <label><strong>Saldos Mensais (Jan..Dez):</strong></label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto' }}>
                {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((mName, idx) => {
                  const m = idx + 1;
                  const cur = editingResource.months[m] || { realized: 0, target: 0 };
                  return (
                    <div key={m} style={{ padding: '0.35rem', background: 'rgba(255,255,255,0.2)', borderRadius: '6px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{m} - {mName}</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name={`realized-${m}`}
                        defaultValue={cur.realized || ''}
                        placeholder="Realizado R$"
                        style={{ width: '100%', fontSize: '0.75rem', marginTop: '0.2rem' }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setIsEditResourceModalOpen(false);
                  setEditingResource(null);
                }}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                Salvar Alterações
              </button>
            </div>
          </form>
        </LiquidLensModal>
      )}
    </main>
  );
}
