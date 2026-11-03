/**
 * Template Seed para Novos Tenants (AC-1, AC-2)
 * Gera a estrutura completa de categorias financeiras, cartões e metas com valores zerados
 * e estritamente sem dados pessoais.
 */

import type {
  Tenant,
  SaaSPlan,
  FinancialCategoryLine,
  CreditCard,
  GoalCategory,
  MultiYearGoal,
  ActionPlanIndicator,
  MonthlyTriad,
} from './types.ts';

export interface TenantTemplate {
  tenant: Tenant;
  lines: FinancialCategoryLine[];
  cards: CreditCard[];
  cardCategories: string[];
  goalCategories: GoalCategory[];
  goals: MultiYearGoal[];
  actionPlanIndicators: ActionPlanIndicator[];
}

function emptyMonthlyTriad(): Record<number, MonthlyTriad> {
  const months: Record<number, MonthlyTriad> = {};
  for (let m = 1; m <= 12; m++) {
    months[m] = {
      month: m,
      realized: 0,
      target: 0,
      settledAt: null,
    };
  }
  return months;
}

function emptyInformedInvoices(): Record<number, number | null> {
  const invoices: Record<number, number | null> = {};
  for (let m = 1; m <= 12; m++) {
    invoices[m] = null;
  }
  return invoices;
}

export function createTenantTemplate(
  tenantId: string,
  tenantName: string,
  plan: SaaSPlan = 'PRO'
): TenantTemplate {
  const tenant: Tenant = {
    id: tenantId,
    name: tenantName,
    slug: tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    plan,
    active: true,
    createdAt: new Date().toISOString(),
  };

  const cards: CreditCard[] = [
    {
      id: `${tenantId}-card-bb`,
      tenantId,
      name: 'Banco do Brasil',
      profile: 'PF',
      closingDay: 25,
      dueDay: 5,
      limitAmount: 10000,
      informedInvoices: emptyInformedInvoices(),
    },
    {
      id: `${tenantId}-card-nu-pf`,
      tenantId,
      name: 'Nubank PF',
      profile: 'PF',
      closingDay: 20,
      dueDay: 28,
      limitAmount: 15000,
      informedInvoices: emptyInformedInvoices(),
    },
    {
      id: `${tenantId}-card-nu-pj`,
      tenantId,
      name: 'Nubank PJ',
      profile: 'PJ',
      closingDay: 15,
      dueDay: 22,
      limitAmount: 20000,
      informedInvoices: emptyInformedInvoices(),
    },
  ];

  const cardCategories: string[] = [
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

  const goalCategories: GoalCategory[] = [
    'FINANCEIRA',
    'DESENVOLVIMENTO_PESSOAL',
    'FISICA_SAUDE',
    'DIVERSAO',
  ];

  const lines: FinancialCategoryLine[] = [];

  // Helper para adicionar linha
  let lineCount = 1;
  const addLine = (
    group: FinancialCategoryLine['group'],
    name: string,
    profile: 'PF' | 'PJ',
    subGroup?: string,
    dueDay?: number,
    linkedCardId?: string
  ) => {
    lines.push({
      id: `${tenantId}-line-${lineCount++}`,
      tenantId,
      group,
      name,
      profile,
      subGroup,
      dueDay,
      linkedCardId,
      months: emptyMonthlyTriad(),
    });
  };

  // 1. RECURSOS_FINANCEIROS
  const pfRecursos = [
    'Dinheiro espécie',
    'Banco do Brasil CDB/Poupança',
    'Banco do Brasil Corrente',
    'Nubank PF CDB/Caixinha',
    'Nubank PF Corrente',
    'Itaú Corrente',
    'Caixa Econômica',
    'Criptomoedas',
    'Previdência Privada',
    'Ações',
    'Empréstimo a receber',
  ];
  for (const name of pfRecursos) {
    addLine('RECURSOS_FINANCEIROS', name, 'PF');
  }
  addLine('RECURSOS_FINANCEIROS', 'Outros', 'PJ');
  addLine('RECURSOS_FINANCEIROS', 'Nubank PJ', 'PJ');

  // 2. RECEITAS
  const socialRec = [
    'Salário Holerite Bruto',
    'Premiação/NF PJ',
    'Férias',
    '13º Salário',
    'Bônus Extra',
  ];
  for (const name of socialRec) {
    addLine('RECEITAS', name, 'PF', 'Rendimento Social', 5);
  }

  const outrasRec = [
    'Outras receitas',
    'Resgate aplicação/VGBL',
    'Serviços Extras',
    'Intermediação/corretagem',
    'Restituição IR',
    'Recebimento consórcio',
  ];
  for (const name of outrasRec) {
    addLine('RECEITAS', name, 'PF', 'Outras Receitas', 20);
  }
  addLine('RECEITAS', 'Imposto Simples Nacional', 'PJ', 'Outras Receitas', 20);

  // 3. INVESTIMENTOS
  const invest = [
    'Financiamento imobiliário',
    'Lotes',
    'Previdência Privada',
    'Criptomoedas',
    'Poupança/CDB',
  ];
  for (const name of invest) {
    addLine('INVESTIMENTOS', name, 'PF', undefined, 10);
  }

  // 4. DESPESAS_FIXAS
  const fixas = [
    { name: 'ITU/IPTU', dueDay: 10 },
    { name: 'Telefonia/Claro', dueDay: 15 },
    { name: 'Condomínios', dueDay: 10 },
    { name: 'INSS', dueDay: 20 },
    { name: 'Plano de saúde', dueDay: 10 },
    { name: 'Internet', dueDay: 15 },
    { name: 'Estudo/Faculdade/Curso', dueDay: 10 },
    { name: 'Seguro carro', dueDay: 15 },
    { name: 'IPVA', dueDay: 20 },
    { name: 'Multas', dueDay: 25 },
  ];
  for (const f of fixas) {
    addLine('DESPESAS_FIXAS', f.name, 'PF', undefined, f.dueDay);
  }

  // 5. DESPESAS_VARIAVEIS
  const variaveis = [
    { name: 'Energia elétrica', dueDay: 12 },
    { name: 'Água/Saneamento', dueDay: 18 },
    { name: 'Gás', dueDay: 20 },
    { name: 'Escritura/Registro/Taxas', dueDay: 15 },
    { name: 'Cartão Banco do Brasil', dueDay: 5, linkedCardId: `${tenantId}-card-bb`, profile: 'PF' as const },
    { name: 'Cartão Nubank PF', dueDay: 28, linkedCardId: `${tenantId}-card-nu-pf`, profile: 'PF' as const },
    { name: 'Cartão Nubank PJ', dueDay: 22, linkedCardId: `${tenantId}-card-nu-pj`, profile: 'PJ' as const },
    { name: 'Manutenção veículo', dueDay: 15 },
    { name: 'Jardinagem/Plantas', dueDay: 15 },
    { name: 'Taxas', dueDay: 10 },
    { name: 'Outros', dueDay: 20 },
  ];
  for (const v of variaveis) {
    addLine('DESPESAS_VARIAVEIS', v.name, v.profile ?? 'PF', undefined, v.dueDay, v.linkedCardId);
  }

  return {
    tenant,
    lines,
    cards,
    cardCategories,
    goalCategories,
    goals: [],
    actionPlanIndicators: [],
  };
}
