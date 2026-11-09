'use client';

import React, { useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

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

export interface MuiKpiCardProps {
  id?: string;
  title: string;
  value?: string | number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  children?: React.ReactNode;
}

/**
 * Card de KPI padronizado com Material UI (Card, CardContent, Typography)
 * Substitui o componente LiquidLensCard (ADR-0004 / AV-111).
 */
function MuiKpiCard({
  id,
  title,
  value,
  variant = 'default',
  children,
}: MuiKpiCardProps) {
  const getBorderColor = () => {
    if (variant === 'success') return '#16a34a';
    if (variant === 'danger') return '#dc2626';
    if (variant === 'warning') return '#d97706';
    return '#2563eb';
  };

  const getValueColor = () => {
    if (variant === 'success') return '#16a34a';
    if (variant === 'danger') return '#dc2626';
    if (variant === 'warning') return '#d97706';
    return '#0f172a';
  };

  return (
    <Card
      id={id}
      className={`kpi-card MuiCard-root ${variant !== 'default' ? `variant-${variant}` : ''}`}
      sx={{
        borderRadius: 2,
        border: '1px solid #e2e8f0',
        borderTop: `4px solid ${getBorderColor()}`,
        boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.08)',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
      tabIndex={0}
      aria-label={title}
    >
      <CardContent sx={{ p: '0 !important' }}>
        <Typography
          variant="body2"
          className="kpi-label"
          sx={{ color: '#64748b', fontWeight: 500, mb: 0.5 }}
        >
          {title}
        </Typography>
        {value !== undefined && (
          <Typography
            variant="h5"
            className={`kpi-value ${variant !== 'default' ? variant : ''}`}
            sx={{ fontWeight: 700, color: getValueColor() }}
          >
            {value}
          </Typography>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * Página principal do SaaS Multi-Tenant no Next.js App Router (ADR-0004 / AV-111)
 * Renderiza interface dos 4 módulos com componentes Material UI (MUI v5/v6)
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
    { id: 'tab-finance', btnId: 'tab-btn-finance', label: '1. Controle Finanças', targetPanelId: 'tab-finance' },
    { id: 'tab-cards', btnId: 'tab-btn-cards', label: '2. Cartões de Crédito', targetPanelId: 'tab-cards' },
    { id: 'tab-goals', btnId: 'tab-btn-goals', label: '3. Propósitos e Metas', targetPanelId: 'tab-goals' },
    { id: 'tab-action-plan', btnId: 'tab-btn-action-plan', label: '4. Plano de Ação', targetPanelId: 'tab-action-plan' },
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

  // Inserção inline direta de nova linha (AC-3 / AV-106)
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

  // Edição inline célula a célula (AC-2 / AV-106)
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

  // Exclusão inline instantânea (AC-4 / AV-106)
  const handleDeleteResource = (id: string, name: string) => {
    if (confirm(`Deseja realmente excluir "${name || 'esta linha'}"?`)) {
      setFinancialLines((prev) => prev.filter((r) => r.id !== id));
    }
  };

  // Regra do Último Saldo Informado para Recursos Financeiros (AC-5 / AV-106)
  const getLastBalance = (res: FinancialLineAccount): number => {
    for (let m = 12; m >= 1; m--) {
      const val = res.months[m]?.realized ?? 0;
      if (val > 0) return val;
    }
    return 0;
  };

  // Regra da Soma Acumulada Anual dos 12 Meses para grupos de Fluxo (AC-5 / AV-106)
  const getAnnualSum = (line: FinancialLineAccount): number => {
    let sum = 0;
    for (let m = 1; m <= 12; m++) {
      sum += line.months[m]?.realized ?? 0;
    }
    return sum;
  };

  // Filtro de Visão PF / PJ (AC-6 / AV-106)
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
    <main className="app-wrapper" style={{ maxWidth: '1440px', margin: '0 auto', padding: '1rem' }}>
      {/* Header com Material UI (Chip, Button, Typography) */}
      <header
        className="saas-header"
        role="banner"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.25rem',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.06)',
        }}
      >
        <div className="header-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Typography variant="h5" component="h1" className="brand-title" sx={{ fontWeight: 700, color: '#0f172a' }}>
            Avance SaaS
          </Typography>
          <Chip
            id="plan-badge"
            label={tenantPlan}
            color="primary"
            size="small"
            className="badge badge-plan MuiChip-root"
            sx={{ fontWeight: 700, borderRadius: 1 }}
          />
          <Button
            id="btn-new-tenant"
            type="button"
            variant="contained"
            color="primary"
            className="btn-primary"
            onClick={() => setIsModalOpen(true)}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            + Novo Tenant
          </Button>
        </div>

        <div className="header-controls" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="control-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="tenant-select" style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>
              Tenant:
            </label>
            <select
              id="tenant-select"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                backgroundColor: '#f8fafc',
              }}
            >
              <option value={tenantName}>{tenantName}</option>
            </select>
          </div>
          <div className="control-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="profile-filter" style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>
              Visão:
            </label>
            <select
              id="profile-filter"
              value={profileFilter}
              onChange={(e) => setProfileFilter(e.target.value as 'ALL' | 'PF' | 'PJ')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                backgroundColor: '#f8fafc',
              }}
            >
              <option value="ALL">Todos (PF + PJ)</option>
              <option value="PF">Pessoa Física (PF)</option>
              <option value="PJ">Pessoa Jurídica (PJ)</option>
            </select>
          </div>
        </div>
      </header>

      {/* Dock de Abas com Material UI Tabs & Tab */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }} className="tab-nav">
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          aria-label="Navegação dos 4 Módulos"
          role="tablist"
          className="tab-nav-tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          {dockTabs.map((tab) => (
            <Tab
              key={tab.id}
              id={tab.btnId}
              value={tab.id}
              label={tab.label}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              aria-controls={tab.targetPanelId}
              role="tab"
              sx={{ fontWeight: 600, textTransform: 'none', fontSize: '0.95rem' }}
            />
          ))}
        </Tabs>
      </Box>

      {/* Módulo 1: Controle Finanças */}
      {activeTab === 'tab-finance' && (
        <section
          id="tab-finance"
          aria-labelledby="tab-btn-finance"
          className="tab-panel"
          style={{ display: 'block' }}
        >
          <div
            className="kpi-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <MuiKpiCard
              id="kpi-received"
              title="Recebido no Mês"
              value={`R$ ${monthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              variant="success"
            />
            <MuiKpiCard id="kpi-to-receive" title="A Receber no Mês" value="R$ 0,00" />
            <MuiKpiCard
              id="kpi-paid"
              title="Pago no Mês (Despesas)"
              value={`R$ ${(monthFixedExpenses + monthVariableExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            />
            <MuiKpiCard id="kpi-to-pay" title="A Pagar no Mês" value="R$ 0,00" />
            <MuiKpiCard id="kpi-overdue-count" title="Contas Atrasadas" value="0 contas" />
            <MuiKpiCard id="kpi-overdue-amount" title="Valor em Atraso" value="R$ 0,00" />
            <MuiKpiCard
              id="kpi-month-result"
              title="Resultado Final do Mês (DRE)"
              value={`R$ ${monthFinalResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              variant={monthFinalResult >= 0 ? 'success' : 'danger'}
            />
            <MuiKpiCard
              id="kpi-accumulated-result"
              title="Resultado Acumulado Ano"
              value={`R$ ${accumulatedResultYear.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              variant={accumulatedResultYear >= 0 ? 'success' : 'danger'}
            />
            <MuiKpiCard
              id="kpi-patrimony-balance"
              title="Patrimônio (Último Saldo)"
              value={`R$ ${totalPatrimony.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            />
          </div>

          {/* Grade Inline de 12 Meses Jan..Dez sem Modais (AV-106 / AC-1 a AC-6) */}
          {groupsConfig.map((grp) => {
            const lines = visibleLines.filter((l) => l.group === grp.group);
            return (
              <Card
                key={grp.group}
                className="section-card MuiCard-root"
                sx={{
                  mb: 2.5,
                  p: 2.5,
                  borderRadius: 2,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.08)',
                }}
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
                  <Typography variant="h6" component="h2" className="section-title" sx={{ fontWeight: 600 }}>
                    {grp.title}
                  </Typography>
                  <Button
                    type="button"
                    id={grp.btnId}
                    variant="contained"
                    color="primary"
                    className="btn-primary btn-add-inline-line"
                    onClick={() => handleAddInlineLine(grp.group)}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    {grp.btnLabel}
                  </Button>
                </div>

                <div className="table-responsive" style={{ overflowX: 'auto' }}>
                  <table className="data-table" aria-label={grp.title} style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                        <th scope="col" style={{ minWidth: '170px', padding: '8px' }}>Conta / Linha</th>
                        <th scope="col" style={{ width: '70px', padding: '8px' }}>Perfil</th>
                        <th scope="col" style={{ minWidth: '75px', padding: '8px' }}>Jan</th>
                        <th scope="col" style={{ minWidth: '75px', padding: '8px' }}>Fev</th>
                        <th scope="col" style={{ minWidth: '75px', padding: '8px' }}>Mar</th>
                        <th scope="col" style={{ minWidth: '75px', padding: '8px' }}>Abr</th>
                        <th scope="col" style={{ minWidth: '75px', padding: '8px' }}>Mai</th>
                        <th scope="col" style={{ minWidth: '75px', padding: '8px' }}>Jun</th>
                        <th scope="col" style={{ minWidth: '75px', padding: '8px' }}>Jul</th>
                        <th scope="col" style={{ minWidth: '75px', padding: '8px' }}>Ago</th>
                        <th scope="col" style={{ minWidth: '75px', padding: '8px' }}>Set</th>
                        <th scope="col" style={{ minWidth: '75px', padding: '8px' }}>Out</th>
                        <th scope="col" style={{ minWidth: '75px', padding: '8px' }}>Nov</th>
                        <th scope="col" style={{ minWidth: '75px', padding: '8px' }}>Dez</th>
                        <th scope="col" style={{ minWidth: '100px', textAlign: 'right', padding: '8px' }}>Total Anual</th>
                        <th scope="col" style={{ width: '80px', textAlign: 'center', padding: '8px' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.length === 0 ? (
                        <tr>
                          <td colSpan={16} style={{ textAlign: 'center', opacity: 0.6, padding: '16px' }}>
                            Nenhum item cadastrado neste grupo. Clique em &quot;+ Nova Linha&quot; para adicionar.
                          </td>
                        </tr>
                      ) : (
                        lines.map((r) => {
                          const totalVal = grp.isBalanceGroup ? getLastBalance(r) : getAnnualSum(r);
                          return (
                            <tr
                              key={r.id}
                              data-group={r.group}
                              data-line-id={r.id}
                              data-profile={r.profile}
                              style={{ borderBottom: '1px solid #f1f5f9' }}
                            >
                              <td style={{ padding: '4px' }}>
                                <input
                                  id={`input-name-${r.id}`}
                                  type="text"
                                  className="cell-inline-input input-inline-name"
                                  value={r.name}
                                  placeholder="Nome da conta..."
                                  onChange={(e) => handleNameChange(r.id, e.target.value)}
                                  aria-label={`Nome da Conta ${r.name}`}
                                  style={{
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    fontWeight: 600,
                                    width: '100%',
                                    padding: '4px 6px',
                                    borderRadius: '4px',
                                  }}
                                />
                              </td>
                              <td style={{ padding: '4px' }}>
                                <select
                                  className="select-inline-profile"
                                  value={r.profile}
                                  onChange={(e) => handleProfileChange(r.id, e.target.value as 'PF' | 'PJ')}
                                  aria-label={`Perfil ${r.name}`}
                                  style={{
                                    border: '1px solid #cbd5e1',
                                    padding: '4px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  <option value="PF">PF</option>
                                  <option value="PJ">PJ</option>
                                </select>
                              </td>
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                                const val = r.months[m]?.realized;
                                return (
                                  <td key={m} data-month={m} style={{ padding: '4px' }}>
                                    <input
                                      type="number"
                                      step="0.01"
                                      className="cell-inline-input input-inline-month"
                                      value={val !== undefined && val !== 0 ? val : ''}
                                      placeholder="0,00"
                                      onChange={(e) => handleCellChange(r.id, m, e.target.value)}
                                      aria-label={`Mês ${m} ${r.name}`}
                                      style={{
                                        border: '1px solid #cbd5e1',
                                        background: '#ffffff',
                                        textAlign: 'right',
                                        width: '100%',
                                        padding: '4px 6px',
                                        borderRadius: '4px',
                                      }}
                                    />
                                  </td>
                                );
                              })}
                              <td style={{ textAlign: 'right', padding: '8px' }}>
                                <strong>
                                  R${' '}
                                  {totalVal.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2,
                                  })}
                                </strong>
                              </td>
                              <td style={{ textAlign: 'center', padding: '4px' }}>
                                <Button
                                  type="button"
                                  variant="outlined"
                                  color="error"
                                  size="small"
                                  className="btn-danger btn-delete-line btn-delete-resource"
                                  onClick={() => handleDeleteResource(r.id, r.name)}
                                  sx={{ textTransform: 'none', padding: '2px 8px', minWidth: 'auto' }}
                                >
                                  Excluir
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}

          <Card
            className="section-card MuiCard-root"
            sx={{
              p: 2.5,
              borderRadius: 2,
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.08)',
            }}
          >
            <div className="section-header" style={{ marginBottom: '1rem' }}>
              <Typography variant="h6" component="h2" className="section-title" sx={{ fontWeight: 600 }}>
                Evolução Mensal e Indicadores Resumo
              </Typography>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <MuiKpiCard id="indicator-investment-rate" title="Taxa de Investimento" value="35%" />
              <MuiKpiCard id="indicator-cards-ratio" title="Cartões ÷ Rendimento" value="28%" />
              <MuiKpiCard id="indicator-paid-percentage" title="% Contas Pagas" value="92%" />
            </div>
          </Card>
        </section>
      )}

      {/* Módulo 2: Cartões de Crédito */}
      {activeTab === 'tab-cards' && (
        <section
          id="tab-cards"
          aria-labelledby="tab-btn-cards"
          className="tab-panel"
          style={{ display: 'block' }}
        >
          <div className="cards-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <MuiKpiCard title="Banco do Brasil Ourocard">
              <Typography variant="body2" sx={{ color: '#475569', mt: 0.5 }}>
                Limite: R$ 15.000,00 | Fatura: R$ 3.420,00
              </Typography>
            </MuiKpiCard>
            <MuiKpiCard title="Nubank PF Mastercard Platinum">
              <Typography variant="body2" sx={{ color: '#475569', mt: 0.5 }}>
                Limite: R$ 12.000,00 | Fatura: R$ 2.150,00
              </Typography>
            </MuiKpiCard>
          </div>
        </section>
      )}

      {/* Módulo 3: Metas */}
      {activeTab === 'tab-goals' && (
        <section
          id="tab-goals"
          aria-labelledby="tab-btn-goals"
          className="tab-panel"
          style={{ display: 'block' }}
        >
          <div
            className="kpi-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            <MuiKpiCard title="Metas Financeiras" value="3 ativas" variant="success" />
            <MuiKpiCard title="Desenvolvimento Pessoal" value="2 ativas" />
            <MuiKpiCard title="Física / Saúde" value="1 ativa" />
            <MuiKpiCard title="Diversão / Lazer" value="1 ativa" />
          </div>
        </section>
      )}

      {/* Módulo 4: Plano de Ação */}
      {activeTab === 'tab-action-plan' && (
        <section
          id="tab-action-plan"
          aria-labelledby="tab-btn-action-plan"
          className="tab-panel"
          style={{ display: 'block' }}
        >
          <div
            className="kpi-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            <MuiKpiCard title="Indicadores SOMA" value="4 acompanhados" />
            <MuiKpiCard title="Indicadores LIMITE_MAXIMO" value="2 acompanhados" />
            <MuiKpiCard title="Indicadores ULTIMO_VALOR" value="2 acompanhados" />
            <MuiKpiCard title="Marcos TEXTO" value="3 concluídos" variant="success" />
          </div>
        </section>
      )}

      {/* Modal Novo Tenant com Material UI Dialog */}
      <Dialog
        id="modal-new-tenant"
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        aria-labelledby="modal-tenant-title"
        slotProps={{
          paper: {
            className: 'modal-content MuiDialog-paper',
            sx: { borderRadius: 2, p: 1, minWidth: { xs: '90%', sm: 480 } },
          },
        }}
      >
        <DialogTitle
          id="modal-tenant-title"
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: 700,
          }}
        >
          Cadastrar Novo Tenant
          <IconButton
            aria-label="Fechar modal"
            onClick={() => setIsModalOpen(false)}
            size="small"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <form onSubmit={handleCreateTenant}>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
            <div className="form-group">
              <label
                htmlFor="input-tenant-name"
                style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.875rem' }}
              >
                Nome da Empresa / Tenant:
              </label>
              <input
                type="text"
                id="input-tenant-name"
                name="name"
                required
                placeholder="Ex: Avance Filial SP"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                }}
              />
            </div>
            <div className="form-group">
              <label
                htmlFor="select-tenant-plan"
                style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.875rem' }}
              >
                Plano de Assinatura:
              </label>
              <select
                id="select-tenant-plan"
                name="plan"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                }}
              >
                <option value="PRO">PRO</option>
                <option value="FREE">FREE</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
              </select>
            </div>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button
              type="button"
              className="btn-secondary"
              variant="outlined"
              color="inherit"
              onClick={() => setIsModalOpen(false)}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              id="btn-submit-tenant"
              className="btn-primary"
              variant="contained"
              color="primary"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Salvar Tenant
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </main>
  );
}
