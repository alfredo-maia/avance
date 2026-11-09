'use client';

import React, { useState } from 'react';
import {
  LiquidLensCard,
  LiquidLensDock,
  LiquidLensModal,
  LiquidLensBadge,
} from '../components/liquid-lens/index.ts';

export type FinancialGroup =
  | 'RECURSOS_FINANCEIROS'
  | 'RECEITAS'
  | 'INVESTIMENTOS'
  | 'DESPESAS_FIXAS'
  | 'DESPESAS_VARIAVEIS';

export interface FinancialLineAccount {
  id: string;
  name: string;
  profile: 'PF' | 'PJ';
  group: FinancialGroup;
  subGroup?: string;
  months: Record<number, { realized: number; target: number }>;
}

export type ResourceAccount = FinancialLineAccount;

/**
 * Página principal do SaaS Multi-Tenant no Next.js App Router (ADR-0002 / AV-98 / AV-100 / AV-101 / AV-106)
 * Renderiza interface dos 4 módulos com componentes Liquid Lens / Liquid Glass UI
 * e Grade Inline contínua de 12 meses (Jan..Dez) sem modais para todos os 5 grupos financeiros.
 */
export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<string>('tab-finance');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [profileFilter, setProfileFilter] = useState<'ALL' | 'PF' | 'PJ'>('ALL');
  const [tenantName, setTenantName] = useState<string>('Avance Matriz');
  const [tenantPlan, setTenantPlan] = useState<string>('PRO');

  const [financialLines, setFinancialLines] = useState<FinancialLineAccount[]>([
    // 1. RECURSOS FINANCEIROS
    {
      id: 'res-1',
      name: 'Banco do Brasil Corrente',
      profile: 'PF',
      group: 'RECURSOS_FINANCEIROS',
      months: { 1: { realized: 25000, target: 20000 }, 2: { realized: 27500, target: 25000 } },
    },
    {
      id: 'res-2',
      name: 'Nubank PF CDB/Caixinha',
      profile: 'PF',
      group: 'RECURSOS_FINANCEIROS',
      months: { 1: { realized: 80000, target: 75000 } },
    },
    {
      id: 'res-3',
      name: 'Nubank PJ Corrente',
      profile: 'PJ',
      group: 'RECURSOS_FINANCEIROS',
      months: { 1: { realized: 15000, target: 12000 } },
    },
    // 2. RECEITAS
    {
      id: 'rec-1',
      name: 'Salário & Pró-labore',
      profile: 'PF',
      group: 'RECEITAS',
      subGroup: 'Trabalho',
      months: { 1: { realized: 12000, target: 12000 }, 2: { realized: 12000, target: 12000 } },
    },
    {
      id: 'rec-2',
      name: 'Contratos Mensais SaaS',
      profile: 'PJ',
      group: 'RECEITAS',
      subGroup: 'Serviços',
      months: { 1: { realized: 20000, target: 18000 }, 2: { realized: 22000, target: 20000 } },
    },
    // 3. INVESTIMENTOS
    {
      id: 'inv-1',
      name: 'Aporte Tesouro Direto Selic',
      profile: 'PF',
      group: 'INVESTIMENTOS',
      subGroup: 'Renda Fixa',
      months: { 1: { realized: 2500, target: 2500 } },
    },
    // 4. DESPESAS FIXAS
    {
      id: 'fix-1',
      name: 'Aluguel & Condomínio',
      profile: 'PF',
      group: 'DESPESAS_FIXAS',
      subGroup: 'Moradia',
      months: { 1: { realized: 2200, target: 2200 } },
    },
    {
      id: 'fix-2',
      name: 'Infraestrutura Cloud AWS',
      profile: 'PJ',
      group: 'DESPESAS_FIXAS',
      subGroup: 'Operacional',
      months: { 1: { realized: 1500, target: 1400 } },
    },
    // 5. DESPESAS VARIÁVEIS
    {
      id: 'var-1',
      name: 'Cartão Alimentação & Mercado',
      profile: 'PF',
      group: 'DESPESAS_VARIAVEIS',
      subGroup: 'Alimentação',
      months: { 1: { realized: 1800, target: 1500 } },
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

  // Inserção inline direta de nova linha (AC-3)
  const handleAddInlineLine = (group: FinancialGroup) => {
    const newId = `line-${Date.now()}`;
    const newLine: FinancialLineAccount = {
      id: newId,
      name: '',
      profile: 'PF',
      group,
      months: {},
    };
    setFinancialLines((prev) => [...prev, newLine]);
    setTimeout(() => {
      const el = document.getElementById(`input-name-${newId}`);
      el?.focus();
    }, 50);
  };

  // Edição inline célula a célula (AC-2)
  const handleCellChange = (lineId: string, month: number, value: string) => {
    const num = value !== '' ? parseFloat(value) : 0;
    setFinancialLines((prev) =>
      prev.map((l) =>
        l.id === lineId
          ? {
              ...l,
              months: {
                ...l.months,
                [month]: { realized: num, target: l.months[month]?.target || 0 },
              },
            }
          : l
      )
    );
  };

  const handleNameChange = (lineId: string, name: string) => {
    setFinancialLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, name } : l))
    );
  };

  const handleProfileChange = (lineId: string, profile: 'PF' | 'PJ') => {
    setFinancialLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, profile } : l))
    );
  };

  // Exclusão inline instantânea (AC-4)
  const handleDeleteResource = (id: string, name: string) => {
    if (confirm(`Deseja realmente excluir "${name || 'esta linha'}"?`)) {
      setFinancialLines((prev) => prev.filter((r) => r.id !== id));
    }
  };

  // Regra do Último Saldo Informado para Recursos Financeiros (AC-5)
  const getLastBalance = (res: FinancialLineAccount): number => {
    for (let m = 12; m >= 1; m--) {
      const val = res.months[m]?.realized ?? 0;
      if (val > 0) return val;
    }
    return 0;
  };

  // Regra da Soma Acumulada Anual dos 12 Meses para grupos de Fluxo (AC-5)
  const getAnnualSum = (line: FinancialLineAccount): number => {
    let sum = 0;
    for (let m = 1; m <= 12; m++) {
      sum += line.months[m]?.realized ?? 0;
    }
    return sum;
  };

  // Filtro de Visão PF / PJ (AC-6)
  const visibleLines = financialLines.filter(
    (l) => profileFilter === 'ALL' || l.profile === profileFilter
  );

  // Cálculos dinâmicos em tempo real para o mês 1 (DRE & KPIs)
  const refMonth = 1;
  const monthRevenue = visibleLines
    .filter((l) => l.group === 'RECEITAS')
    .reduce((sum, l) => sum + (l.months[refMonth]?.realized ?? 0), 0);

  const monthInvestments = visibleLines
    .filter((l) => l.group === 'INVESTIMENTOS')
    .reduce((sum, l) => sum + (l.months[refMonth]?.realized ?? 0), 0);

  const monthFixedExpenses = visibleLines
    .filter((l) => l.group === 'DESPESAS_FIXAS')
    .reduce((sum, l) => sum + (l.months[refMonth]?.realized ?? 0), 0);

  const monthVariableExpenses = visibleLines
    .filter((l) => l.group === 'DESPESAS_VARIAVEIS')
    .reduce((sum, l) => sum + (l.months[refMonth]?.realized ?? 0), 0);

  const monthFinalResult =
    monthRevenue - monthInvestments - monthFixedExpenses - monthVariableExpenses;

  let accumulatedResultYear = 0;
  for (let m = 1; m <= 12; m++) {
    const rev = visibleLines
      .filter((l) => l.group === 'RECEITAS')
      .reduce((s, l) => s + (l.months[m]?.realized ?? 0), 0);
    const inv = visibleLines
      .filter((l) => l.group === 'INVESTIMENTOS')
      .reduce((s, l) => s + (l.months[m]?.realized ?? 0), 0);
    const fix = visibleLines
      .filter((l) => l.group === 'DESPESAS_FIXAS')
      .reduce((s, l) => s + (l.months[m]?.realized ?? 0), 0);
    const v = visibleLines
      .filter((l) => l.group === 'DESPESAS_VARIAVEIS')
      .reduce((s, l) => s + (l.months[m]?.realized ?? 0), 0);
    accumulatedResultYear += rev - inv - fix - v;
  }

  const totalPatrimony = visibleLines
    .filter((l) => l.group === 'RECURSOS_FINANCEIROS')
    .reduce((acc, r) => acc + getLastBalance(r), 0);

  const groupsConfig: Array<{
    group: FinancialGroup;
    title: string;
    btnId: string;
    btnLabel: string;
    isBalanceGroup: boolean;
  }> = [
    {
      group: 'RECURSOS_FINANCEIROS',
      title: '1. Recursos Financeiros & Saldos (Último Saldo Informado)',
      btnId: 'btn-new-resource',
      btnLabel: '+ Nova Linha',
      isBalanceGroup: true,
    },
    {
      group: 'RECEITAS',
      title: '2. Receitas (Soma Acumulada Anual)',
      btnId: 'btn-new-receitas',
      btnLabel: '+ Nova Linha',
      isBalanceGroup: false,
    },
    {
      group: 'INVESTIMENTOS',
      title: '3. Investimentos (Soma Acumulada Anual)',
      btnId: 'btn-new-investimentos',
      btnLabel: '+ Nova Linha',
      isBalanceGroup: false,
    },
    {
      group: 'DESPESAS_FIXAS',
      title: '4. Despesas Fixas (Soma Acumulada Anual)',
      btnId: 'btn-new-despesas-fixas',
      btnLabel: '+ Nova Linha',
      isBalanceGroup: false,
    },
    {
      group: 'DESPESAS_VARIAVEIS',
      title: '5. Despesas Variáveis (Soma Acumulada Anual)',
      btnId: 'btn-new-despesas-variaveis',
      btnLabel: '+ Nova Linha',
      isBalanceGroup: false,
    },
  ];

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
            <select
              id="tenant-select"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
            >
              <option value={tenantName}>{tenantName}</option>
            </select>
          </div>
          <div className="control-group">
            <label htmlFor="profile-filter">Visão:</label>
            <select
              id="profile-filter"
              value={profileFilter}
              onChange={(e) => setProfileFilter(e.target.value as 'ALL' | 'PF' | 'PJ')}
            >
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
            <LiquidLensCard
              id="kpi-received"
              title="Recebido no Mês"
              value={`R$ ${monthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              variant="success"
            />
            <LiquidLensCard id="kpi-to-receive" title="A Receber no Mês" value="R$ 0,00" />
            <LiquidLensCard
              id="kpi-paid"
              title="Pago no Mês (Despesas)"
              value={`R$ ${(monthFixedExpenses + monthVariableExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            />
            <LiquidLensCard id="kpi-to-pay" title="A Pagar no Mês" value="R$ 0,00" />
            <LiquidLensCard id="kpi-overdue-count" title="Contas Atrasadas" value="0 contas" />
            <LiquidLensCard id="kpi-overdue-amount" title="Valor em Atraso" value="R$ 0,00" />
            <LiquidLensCard
              id="kpi-month-result"
              title="Resultado Final do Mês (DRE)"
              value={`R$ ${monthFinalResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              variant={monthFinalResult >= 0 ? 'success' : 'danger'}
            />
            <LiquidLensCard
              id="kpi-accumulated-result"
              title="Resultado Acumulado Ano"
              value={`R$ ${accumulatedResultYear.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              variant={accumulatedResultYear >= 0 ? 'success' : 'danger'}
            />
            <LiquidLensCard
              id="kpi-patrimony-balance"
              title="Patrimônio (Último Saldo)"
              value={`R$ ${totalPatrimony.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            />
          </div>

          {/* Grade Inline de 12 Meses Jan..Dez sem Modais (AV-106 / AC-1 a AC-6) */}
          {groupsConfig.map((grp) => {
            const lines = visibleLines.filter((l) => l.group === grp.group);
            return (
              <div
                key={grp.group}
                className="section-card liquid-lens"
                style={{ marginBottom: '1.25rem' }}
              >
                <div
                  className="section-header"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem',
                  }}
                >
                  <h2 className="section-title">{grp.title}</h2>
                  <button
                    type="button"
                    id={grp.btnId}
                    className="btn-primary btn-add-inline-line"
                    onClick={() => handleAddInlineLine(grp.group)}
                  >
                    {grp.btnLabel}
                  </button>
                </div>

                <div className="table-responsive">
                  <table className="data-table" aria-label={grp.title}>
                    <thead>
                      <tr>
                        <th scope="col" style={{ minWidth: '170px' }}>Conta / Linha</th>
                        <th scope="col" style={{ width: '70px' }}>Perfil</th>
                        <th scope="col" style={{ minWidth: '75px' }}>Jan</th>
                        <th scope="col" style={{ minWidth: '75px' }}>Fev</th>
                        <th scope="col" style={{ minWidth: '75px' }}>Mar</th>
                        <th scope="col" style={{ minWidth: '75px' }}>Abr</th>
                        <th scope="col" style={{ minWidth: '75px' }}>Mai</th>
                        <th scope="col" style={{ minWidth: '75px' }}>Jun</th>
                        <th scope="col" style={{ minWidth: '75px' }}>Jul</th>
                        <th scope="col" style={{ minWidth: '75px' }}>Ago</th>
                        <th scope="col" style={{ minWidth: '75px' }}>Set</th>
                        <th scope="col" style={{ minWidth: '75px' }}>Out</th>
                        <th scope="col" style={{ minWidth: '75px' }}>Nov</th>
                        <th scope="col" style={{ minWidth: '75px' }}>Dez</th>
                        <th scope="col" style={{ minWidth: '100px', textAlign: 'right' }}>Total Anual</th>
                        <th scope="col" style={{ width: '80px', textAlign: 'center' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.length === 0 ? (
                        <tr>
                          <td colSpan={16} style={{ textAlign: 'center', opacity: 0.6 }}>
                            Nenhum item cadastrado neste grupo. Clique em &quot;+ Nova Linha&quot; para adicionar.
                          </td>
                        </tr>
                      ) : (
                        lines.map((r) => {
                          const totalVal = grp.isBalanceGroup ? getLastBalance(r) : getAnnualSum(r);
                          return (
                            <tr key={r.id} data-group={r.group} data-line-id={r.id} data-profile={r.profile}>
                              <td>
                                <input
                                  id={`input-name-${r.id}`}
                                  type="text"
                                  className="cell-inline-input input-inline-name"
                                  value={r.name}
                                  placeholder="Nome da conta..."
                                  onChange={(e) => handleNameChange(r.id, e.target.value)}
                                  aria-label={`Nome da Conta ${r.name}`}
                                  style={{
                                    border: '1px solid transparent',
                                    background: 'transparent',
                                    fontWeight: 600,
                                    width: '100%',
                                    padding: '4px 6px',
                                    borderRadius: '4px',
                                  }}
                                />
                              </td>
                              <td>
                                <select
                                  className="select-inline-profile"
                                  value={r.profile}
                                  onChange={(e) => handleProfileChange(r.id, e.target.value as 'PF' | 'PJ')}
                                  aria-label={`Perfil ${r.name}`}
                                >
                                  <option value="PF">PF</option>
                                  <option value="PJ">PJ</option>
                                </select>
                              </td>
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                                const val = r.months[m]?.realized;
                                return (
                                  <td key={m} data-month={m}>
                                    <input
                                      type="number"
                                      step="0.01"
                                      className="cell-inline-input input-inline-month"
                                      value={val !== undefined && val !== 0 ? val : ''}
                                      placeholder="0,00"
                                      onChange={(e) => handleCellChange(r.id, m, e.target.value)}
                                      aria-label={`Mês ${m} ${r.name}`}
                                      style={{
                                        border: '1px solid transparent',
                                        background: 'transparent',
                                        textAlign: 'right',
                                        width: '100%',
                                        padding: '4px 6px',
                                        borderRadius: '4px',
                                      }}
                                    />
                                  </td>
                                );
                              })}
                              <td style={{ textAlign: 'right' }}>
                                <strong>
                                  R${' '}
                                  {totalVal.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2,
                                  })}
                                </strong>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  className="btn-danger btn-delete-line btn-delete-resource"
                                  onClick={() => handleDeleteResource(r.id, r.name)}
                                >
                                  Excluir
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

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

      {/* Modal Novo Tenant (Permanece para onboarding multi-tenant) */}
      <LiquidLensModal
        id="modal-new-tenant"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Cadastrar Novo Tenant"
      >
        <form onSubmit={handleCreateTenant}>
          <div className="form-group">
            <label htmlFor="input-tenant-name">Nome da Empresa / Tenant:</label>
            <input
              type="text"
              id="input-tenant-name"
              name="name"
              required
              placeholder="Ex: Avance Filial SP"
            />
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
