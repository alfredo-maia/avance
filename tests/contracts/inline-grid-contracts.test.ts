import { describe, it, expect, beforeEach } from 'vitest';
import { SaaSStore } from '../../src/server/saas-store.ts';
import { createApiRouteHandlers } from '../../src/app/api/v1/route-handlers.ts';
import type { FinancialGroup } from '../../src/domain/types.ts';

describe('[Backend TDD] Contratos e Endpoints de Edição e Criação Inline (Módulo 1 / AV-105)', () => {
  let store: SaaSStore;
  let handlers: ReturnType<typeof createApiRouteHandlers>;
  let tenantId: string;

  beforeEach(() => {
    store = new SaaSStore();
    handlers = createApiRouteHandlers(store);
    const tenant = store.createTenantWithSeed('Empresa Inline S/A', 'empresa-inline', 'PRO');
    tenantId = tenant.id;
  });

  describe('AC-1: Endpoint de Criação Direta Inline de Linha/Conta com Valores Zerados', () => {
    it('deve criar uma linha inline direta para RECEITAS com valores mensais zerados (Jan a Dez)', async () => {
      const res = await (handlers as any).handlePostInlineFinanceLine({
        tenantId,
        group: 'RECEITAS',
        name: 'Vendas de Software SaaS',
        profile: 'PJ',
        subGroup: 'Serviços',
      });

      expect(res.status).toBe(201);
      expect(res.data.id).toBeDefined();
      expect(res.data.group).toBe('RECEITAS');
      expect(res.data.name).toBe('Vendas de Software SaaS');
      expect(res.data.profile).toBe('PJ');

      // 12 meses inicializados zerados
      expect(Object.keys(res.data.months)).toHaveLength(12);
      for (let m = 1; m <= 12; m++) {
        expect(res.data.months[m]).toEqual({
          month: m,
          realized: 0,
          target: 0,
          settledAt: null,
        });
      }

      // Computed line e KPIs retornados
      expect(res.data.computed).toBeDefined();
      expect(res.data.computed.totalRealized).toBe(0);
      expect(res.data.computed.totalTarget).toBe(0);
      expect(res.data.kpis).toBeDefined();
    });

    it('deve permitir criação inline de linha em branco com nome vazio ou default para qualquer um dos 5 grupos', async () => {
      const groups: FinancialGroup[] = [
        'RECEITAS',
        'INVESTIMENTOS',
        'DESPESAS_FIXAS',
        'DESPESAS_VARIAVEIS',
        'RECURSOS_FINANCEIROS',
      ];

      for (const group of groups) {
        const res = await (handlers as any).handlePostInlineFinanceLine({
          tenantId,
          group,
          // name omitido propositalmente para simular clique direto no "+ Nova Linha"
        });

        expect(res.status).toBe(201);
        expect(res.data.group).toBe(group);
        expect(res.data.profile).toBe('PF'); // default PF
        expect(res.data.months[1].realized).toBe(0);
        expect(res.data.months[12].realized).toBe(0);
      }
    });

    it('deve validar dados obrigatórios e rejeitar tenant inexistente com 404 e grupo inválido com 400', async () => {
      // Sem tenantId
      const resNoTenant = await (handlers as any).handlePostInlineFinanceLine({
        tenantId: '',
        group: 'RECEITAS',
      });
      expect(resNoTenant.status).toBe(400);

      // Grupo inválido
      const resBadGroup = await (handlers as any).handlePostInlineFinanceLine({
        tenantId,
        group: 'GRUPO_INEXISTENTE',
      });
      expect(resBadGroup.status).toBe(400);

      // Tenant inexistente
      const resNotFound = await (handlers as any).handlePostInlineFinanceLine({
        tenantId: 'tenant-fantasma-999',
        group: 'RECEITAS',
      });
      expect(resNotFound.status).toBe(404);
    });
  });

  describe('AC-2: Endpoint de Atualização Inline Célula a Célula (Auto-Save)', () => {
    it('deve atualizar valor mensal individual (realized) via handlePatchFinanceCell com recálculo imediato', async () => {
      // Cria linha de receita
      const lineRes = await (handlers as any).handlePostInlineFinanceLine({
        tenantId,
        group: 'RECEITAS',
        name: 'Consultoria Mensal',
        profile: 'PJ',
      });
      const lineId = lineRes.data.id;

      // Atualiza célula do mês 3 (Março) para 15.000
      const patchRes = await (handlers as any).handlePatchFinanceCell({
        tenantId,
        lineId,
        month: 3,
        realized: 15000,
        target: 12000,
        settledAt: '2026-03-10',
      });

      expect(patchRes.status).toBe(200);
      expect(patchRes.data.months[3].realized).toBe(15000);
      expect(patchRes.data.months[3].target).toBe(12000);
      expect(patchRes.data.months[3].settledAt).toBe('2026-03-10');

      // Outros meses continuam zerados
      expect(patchRes.data.months[1].realized).toBe(0);
      expect(patchRes.data.months[2].realized).toBe(0);

      // Total acumulado da linha recalculado
      expect(patchRes.data.computed.totalRealized).toBe(15000);
      expect(patchRes.data.computed.totalTarget).toBe(12000);

      // KPIs do DRE recalculados em tempo real
      expect(patchRes.data.kpis).toBeDefined();
      expect(patchRes.data.kpis.monthRevenue).toBeGreaterThanOrEqual(15000);
    });

    it('deve aceitar atualização via formato { field, value } para edição direta de input', async () => {
      const lineRes = await (handlers as any).handlePostInlineFinanceLine({
        tenantId,
        group: 'DESPESAS_VARIAVEIS',
        name: 'Combustível',
      });
      const lineId = lineRes.data.id;

      const patchFieldRes = await (handlers as any).handlePatchFinanceCell({
        tenantId,
        lineId,
        month: 5,
        field: 'realized',
        value: 480,
      });

      expect(patchFieldRes.status).toBe(200);
      expect(patchFieldRes.data.months[5].realized).toBe(480);
      expect(patchFieldRes.data.computed.totalRealized).toBe(480);
    });

    it('deve validar limites do mês (1 a 12) retornando 400 para valores inválidos', async () => {
      const lineRes = await (handlers as any).handlePostInlineFinanceLine({
        tenantId,
        group: 'RECEITAS',
        name: 'Teste Limite',
      });
      const lineId = lineRes.data.id;

      const badMonth0 = await (handlers as any).handlePatchFinanceCell({
        tenantId,
        lineId,
        month: 0,
        realized: 100,
      });
      expect(badMonth0.status).toBe(400);

      const badMonth13 = await (handlers as any).handlePatchFinanceCell({
        tenantId,
        lineId,
        month: 13,
        realized: 100,
      });
      expect(badMonth13.status).toBe(400);
    });
  });

  describe('AC-3: Atualização Inline de Metadados da Linha (Nome, Perfil, Lote)', () => {
    it('deve atualizar nome e perfil da linha inline preservando os valores mensais preenchidos', async () => {
      const lineRes = await (handlers as any).handlePostInlineFinanceLine({
        tenantId,
        group: 'DESPESAS_FIXAS',
        name: 'Nome Antigo',
        profile: 'PF',
      });
      const lineId = lineRes.data.id;

      // Preenche mês 1 e 2
      await (handlers as any).handlePatchFinanceCell({
        tenantId,
        lineId,
        month: 1,
        realized: 1200,
      });
      await (handlers as any).handlePatchFinanceCell({
        tenantId,
        lineId,
        month: 2,
        realized: 1200,
      });

      // Atualiza nome e perfil inline
      const updateMetaRes = await handlers.handlePutFinanceLine({
        tenantId,
        lineId,
        name: 'Aluguel Matriz Corporativa',
        profile: 'PJ',
      });

      expect(updateMetaRes.status).toBe(200);
      expect(updateMetaRes.data.name).toBe('Aluguel Matriz Corporativa');
      expect(updateMetaRes.data.profile).toBe('PJ');
      // Valores mensais anteriores devem ser preservados
      expect(updateMetaRes.data.months[1].realized).toBe(1200);
      expect(updateMetaRes.data.months[2].realized).toBe(1200);
      expect(updateMetaRes.data.computed.totalRealized).toBe(2400);
    });
  });

  describe('AC-4: Regras de Consolidação — Fluxos (Soma dos 12 Meses) vs Recursos Financeiros (Último Saldo)', () => {
    it('em Grupos de Fluxo (RECEITAS, INVESTIMENTOS, DESPESAS_FIXAS, DESPESAS_VARIAVEIS), o total anual é a SOMA acumulada dos 12 meses', async () => {
      // Linha de Receitas
      const recRes = await (handlers as any).handlePostInlineFinanceLine({
        tenantId,
        group: 'RECEITAS',
        name: 'Assinaturas Cloud',
      });
      const recId = recRes.data.id;

      // Adiciona valores em Jan, Fev, Mar, Abr
      await (handlers as any).handlePatchFinanceCell({ tenantId, lineId: recId, month: 1, realized: 1000 });
      await (handlers as any).handlePatchFinanceCell({ tenantId, lineId: recId, month: 2, realized: 2000 });
      await (handlers as any).handlePatchFinanceCell({ tenantId, lineId: recId, month: 3, realized: 3000 });
      const lastRec = await (handlers as any).handlePatchFinanceCell({ tenantId, lineId: recId, month: 4, realized: 4000 });

      // Total = 1000 + 2000 + 3000 + 4000 = 10.000
      expect(lastRec.data.computed.totalRealized).toBe(10000);

      // Linha de Despesas Fixas
      const fixRes = await (handlers as any).handlePostInlineFinanceLine({
        tenantId,
        group: 'DESPESAS_FIXAS',
        name: 'Servidores AWS',
      });
      const fixId = fixRes.data.id;
      await (handlers as any).handlePatchFinanceCell({ tenantId, lineId: fixId, month: 1, realized: 500 });
      await (handlers as any).handlePatchFinanceCell({ tenantId, lineId: fixId, month: 2, realized: 700 });
      const lastFix = await (handlers as any).handlePatchFinanceCell({ tenantId, lineId: fixId, month: 3, realized: 800 });

      // Total = 500 + 700 + 800 = 2.000
      expect(lastFix.data.computed.totalRealized).toBe(2000);
    });

    it('em RECURSOS_FINANCEIROS, a consolidação anual reflete o ÚLTIMO SALDO INFORMADO e não a soma', async () => {
      const bankRes = await (handlers as any).handlePostInlineFinanceLine({
        tenantId,
        group: 'RECURSOS_FINANCEIROS',
        name: 'Conta Safra PJ',
        profile: 'PJ',
      });
      const bankId = bankRes.data.id;

      // Saldo em Jan = 50.000
      const patchJan = await (handlers as any).handlePatchFinanceCell({
        tenantId,
        lineId: bankId,
        month: 1,
        realized: 50000,
      });
      expect(patchJan.data.computed.totalRealized).toBe(50000);

      // Saldo em Fev = 65.000
      const patchFev = await (handlers as any).handlePatchFinanceCell({
        tenantId,
        lineId: bankId,
        month: 2,
        realized: 65000,
      });
      // NÃO deve somar 50.000 + 65.000 = 115.000! Deve ser o último saldo (65.000)
      expect(patchFev.data.computed.totalRealized).toBe(65000);

      // Saldo em Mar = 42.000
      const patchMar = await (handlers as any).handlePatchFinanceCell({
        tenantId,
        lineId: bankId,
        month: 3,
        realized: 42000,
      });
      expect(patchMar.data.computed.totalRealized).toBe(42000);

      // Meses posteriores 4..12 estão zerados; o último saldo continua sendo o do mês 3 (42.000)
      expect(patchMar.data.months[4].realized).toBe(0);
      expect(patchMar.data.computed.totalRealized).toBe(42000);
    });
  });

  describe('AC-5: Exclusão Inline e Isolamento Multi-Tenant', () => {
    it('deve excluir linha inline com retorno de sucesso e recálculo do dashboard', async () => {
      const lineRes = await (handlers as any).handlePostInlineFinanceLine({
        tenantId,
        group: 'RECEITAS',
        name: 'Receita Temporária',
      });
      const lineId = lineRes.data.id;

      // Exclusão
      const delRes = await handlers.handleDeleteFinanceLine({
        tenantId,
        lineId,
      });
      expect(delRes.status).toBe(200);
      expect(delRes.data.success).toBe(true);

      // Tentar atualizar a linha excluída retorna 404
      const patchAfterDel = await (handlers as any).handlePatchFinanceCell({
        tenantId,
        lineId,
        month: 1,
        realized: 100,
      });
      expect(patchAfterDel.status).toBe(404);
    });

    it('deve impedir acesso cruzado entre tenants (isolamento multi-tenant estrito)', async () => {
      const otherTenant = store.createTenantWithSeed('Outra Empresa', 'outra-empresa');

      const lineRes = await (handlers as any).handlePostInlineFinanceLine({
        tenantId,
        group: 'RECEITAS',
        name: 'Segredo Tenant 1',
      });
      const lineId = lineRes.data.id;

      // Tentativa de update com outro tenantId
      const crossPatch = await (handlers as any).handlePatchFinanceCell({
        tenantId: otherTenant.id,
        lineId,
        month: 1,
        realized: 9999,
      });
      expect(crossPatch.status).toBe(404);
    });
  });
});
